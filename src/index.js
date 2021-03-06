const prefixes = ['webkit'];

class Grade {
    constructor(container, img_selector) {
        this.container = container;
        this.image = this.container.querySelector(img_selector) || this.container.querySelector('img')
        if(!this.image || !this.container){
            return
        }
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageDimensions = {
            width: 0,
            height: 0
        };
        this.imageData = [];
        this.readImage()
    }

    readImage() {
        this.imageDimensions.width = this.image.width * 0.1;
        this.imageDimensions.height = this.image.height * 0.1;
        this.render()
    }

    getImageData() {
        let imageData = this.ctx.getImageData(
            0, 0, this.imageDimensions.width, this.imageDimensions.height
        ).data;
        this.imageData = Array.from(imageData)
    }

    getChunkedImageData() {
        const perChunk = 4;

        let chunked = this.imageData.reduce((ar, it, i) => {
            const ix = Math.floor(i / perChunk)
            if (!ar[ix]) {
                ar[ix] = []
            }
            ar[ix].push(it);
            return ar
        }, []);

        let filtered = chunked.filter(rgba => {
            return rgba.slice(0, 2).every(val => val < 250) && rgba.slice(0, 2).every(val => val > 0)
        });

        return filtered
    }

    getRGBAGradientValues(top) {
        return top.map((color, index) => {
            return `rgb(${color.rgba.slice(0, 3).join(',')}) ${index == 0 ? '0%' : '75%'}`
        }).join(',')
    }

    getCSSGradientProperty(top) {
        const val = this.getRGBAGradientValues(top);
        return prefixes.map(prefix => {
            return `background-image: -${prefix}-linear-gradient(
                        135deg,
                        ${val}
                    )`
        }).concat([`background-image: linear-gradient(
                    135deg,
                    ${val}
                )`]).join(';')
    }

    getSortedValues(uniq) {
        const occurs = Object.keys(uniq).map(key => {
                const rgbaKey = key;
                let components = key.split('|'),
                    brightness = ((components[0] * 299) + (components[1] * 587) + (components[2] * 114)) / 1000
                return {
                    rgba: rgbaKey.split('|'),
                    occurs: uniq[key],
                    brightness
                }
            }).sort((a, b) => a.occurs - b.occurs).reverse().slice(0, 10);
        return occurs.sort((a, b) => a.brightness - b.brightness).reverse()
    }

    getTopValues(uniq) {
        let sorted = this.getSortedValues(uniq);
        return [sorted[0], sorted[sorted.length - 1]]
    }

    getUniqValues(chunked) {
        return chunked.reduce((accum, current) => {
            let key = current.join('|');
            if (!accum[key]) {
                accum[key] = 1;
                return accum
            }
            accum[key] = ++(accum[key]);
            return accum
        }, {})
    }

    renderGradient() {
        const ls = window.localStorage;
        const item_name = `grade-${this.image.getAttribute('src').split('/').slice(-1)[0]}`;
        let top = null;

        if (ls && ls.getItem(item_name)) {
            top = JSON.parse(ls.getItem(item_name));
        } else {
            let chunked = this.getChunkedImageData();
            top = this.getTopValues(this.getUniqValues(chunked));

            if (ls) {
                ls.setItem(item_name, JSON.stringify(top));
            }
        }

        let gradientProperty = this.getCSSGradientProperty(top);

        let style = `${this.container.getAttribute('style') || ''}; ${gradientProperty}`;
        this.container.setAttribute('style', style)
    }

    render() {
        this.canvas.width = this.imageDimensions.width;
        this.canvas.height = this.imageDimensions.height;
        this.ctx.drawImage(this.image, 0, 0, this.imageDimensions.width, this.imageDimensions.height);
        this.getImageData();
        this.renderGradient();
    }
}

module.exports = (containers, img_selector) => {
    NodeList.prototype.isPrototypeOf(containers)
    ? Array.from(containers).forEach(container => new Grade(container, img_selector))
    : new Grade(containers, img_selector)
};
