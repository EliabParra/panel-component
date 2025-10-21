import { Fast } from '../Fast/Fast.js'

export class PanelComponent extends Fast {
    constructor(props) {
        super(props)
        this.built = () => {}
        this.attachShadow({ mode: 'open' })
        this._rows = new Map()
        this._elements = new Map()
        this.stylesFileName = 'PanelComponent'
        this.addToBody()
    }

    static get observedAttributes() {
        return ["title", "show-close", "resizable", "draggable"]
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this[name.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = newValue
        }
    }

    async connectedCallback() {
        await this.#render()
        await this.#initializeFromLightDOM()
        this.built()
        await this.#checkProps()
        await this.#setupEvents()
    }

    #getTemplate() {
        return `
            <button class="show-panel-btn" aria-label="Mostrar panel">Mostrar Panel</button>
            <div class="panel-wrapper">
                <div class="panel-container panel-hidden">
                    <header class="panel-header">
                        <h2 class="panel-title"></h2>
                        <button class="panel-close-btn" aria-label="Cerrar panel">&times;</button>
                    </header>
                    <main class="panel-content"></main>
                </div>
            </div>
        `
    }

    async #getStyles() { return await fast.getCssFile('PanelComponent') }

    async #render() {
        this.shadowRoot.innerHTML = ''
        let sheet = new CSSStyleSheet()
        let css = await this.#getStyles(this.stylesFileName)
        sheet.replaceSync(css)
        this.shadowRoot.adoptedStyleSheets = [sheet]
        this.shadowRoot.innerHTML += this.#getTemplate()

        // elements
        this.$showPanelBtn = this.shadowRoot.querySelector('.show-panel-btn')
        this.$wrapper = this.shadowRoot.querySelector('.panel-wrapper')
        this.$container = this.shadowRoot.querySelector('.panel-container')
        this.$header = this.shadowRoot.querySelector('.panel-header')
        this.$title = this.shadowRoot.querySelector('.panel-title')
        this.$close = this.shadowRoot.querySelector('.panel-close-btn')
        this.$content = this.shadowRoot.querySelector('.panel-content')

        if (!this.props) {
            this.title = this.getAttribute('title') || 'Panel Component'
            this.$title.textContent = this.title

            if (!this.showClose) this.$close.style.display = 'none'
            else this.$close.style.display = 'block'
        } else {
            this.$title.textContent = this.props.title
            this.title = this.props.title
            this.setAttribute('title', this.title)

            if (!this.props.showClose) this.$close.style.display = 'none'
            else this.$close.style.display = 'block'
        }

        // resizer handle
        this.$resizer = document.createElement('div')
        this.$resizer.className = 'panel-resizer'
        this.$resizer.innerHTML = '&#x2921;'
        this.$container.appendChild(this.$resizer)

        // initial position/size (restore from storage if present)
        const saved = this._readState()
        this.$container.style.width = saved.width || this.getAttribute('width') || '400px'
        this.$container.style.height = saved.height || this.getAttribute('height') || '300px'
        if (saved.left && saved.top) {
            // restore as fixed so that later drags keep behavior
            this.$container.style.position = 'fixed'
            this.$container.style.left = saved.left
            this.$container.style.top = saved.top
        }
    }

    #setupEvents() {
        return new Promise((resolve, reject) => {
            try {
                // show button
                this.$showPanelBtn.addEventListener('click', () => this.toggle())

                // close button
                this.$close.addEventListener('click', () => this.hide())

                // drag
                if (this.draggable) {
                    this.$header.style.cursor = 'move'
                    this.$header.addEventListener('pointerdown', this._onDragStart = (e) => this._dragStart(e))
                } else this.$header.style.cursor = 'default'

                // resizer
                if (this.resizable) this.$resizer.addEventListener('pointerdown', this._onResizeStart = (e) => this._resizeStart(e))
                else this.$resizer.style.display = 'none'

                resolve(this)
            } catch (error) {
                console.error('Error setting up events:', error)
                reject(error)
            }
        })
    }

    #initializeFromLightDOM() {
        return new Promise((resolve, reject) => {
            try {
                const rows = Array.from(this.querySelectorAll(':scope > [row-id]'))
        
                rows.forEach((row, index) => {
                    const rowId = row.getAttribute('row-id') || `row-${index + 1}`
                    const rowElements = Array.from(row.children)
        
                    if (!row.getAttribute('row-id')) row.setAttribute('row-id', rowId)
        
                    const rowStyle = row.getAttribute('row-style')
                    if (rowStyle) row.style.cssText += rowStyle
                    row.removeAttribute('row-style')

                    console.log();
        
                    const contentEditable = row.hasAttribute('contenteditable') || row.hasAttribute('content-editable')
        
                    if (row.hasAttribute("x") || row.hasAttribute("y")) {
                        const x = row.getAttribute("x") ?? "0"
                        const y = row.getAttribute("y") ?? "0"
                        this.addElement({ id: rowId, x, y, element: row })
                    } else {
                        this.addRow({ id: rowId, elements: rowElements, contentEditable, rowInlineStyles: row.style.cssText })
                        row.remove()
                    }
                })

                resolve(this)
            } catch (error) {
                console.error('Error initializing from light DOM:', error)
                reject(error)
            }
        })
    }

    #checkProps() {
        return new Promise(async (resolve, reject) => {
            try {
                if (this.props) {
                    for (let attr in this.props) {
                        if (this.props[attr] === 'contenteditable' || this.props[attr] === 'content-editable') continue
                        this.setAttribute(attr, this.props[attr])
                        this[attr] = this.props[attr]
                    }
                }
                resolve(this)
            }
            catch(e){
                console.error('Error checking props:', e)
                reject(e)
            }
        })
    }

    addRow({ id, elements = [], styles = {}, contentEditable, rowInlineStyles = '' }) {
        if (this._rows.has(id)) {
            console.warn(`Row with id "${id}" already exists. Skipping.`)
            return this
        }

        const row = document.createElement('div')
        row.className = 'row'
        row.setAttribute('row-id', id)
        if (contentEditable) row.setAttribute('contenteditable', 'true')

        if (rowInlineStyles != '') row.style.cssText += rowInlineStyles
        else Object.assign(row.style, styles)

        for (const el of elements) {
            if (typeof el === 'string') row.insertAdjacentHTML('beforeend', el)
            else row.appendChild(el)
        }

        this.$content.appendChild(row)
        this._rows.set(id, { row, elements, styles, contentEditable })
        return this
    }

    addElement({ id, x, y, element, styles = {} }) {
        if (this._elements.has(id)) {
            console.warn(`Element with id "${id}" already exists. Skipping.`)
            return this
        }

        if (typeof element === 'string') element = this._createFromHTML(element)

        Object.assign(element.style, styles)

        element.style.position = 'absolute'
        element.style.left = x + 'px'
        element.style.top = y + 'px'
        this.$content.appendChild(element)

        this._elements.set(id, { x, y, element, styles })
        return this
    }

    show() {
        this.$container.classList.remove('panel-hidden')
        this.$container.style.visibility = 'visible'
        this.$container.style.opacity = '1'
        this.$container.style.transform = 'none'
        return this
    }

    hide() {
        this.$container.classList.add('panel-hidden')
        return this
    }

    toggle() {
        if (this.$container.classList.contains('panel-hidden')) this.show()
        else this.hide()
        return this
    }

    addToBody() { if (!document.body.contains(this)) document.body.appendChild(this) }

    //* Allow clearing saved size/position
    resetState(){
        try{ localStorage.removeItem(this._storageKey()); }catch(e){}
        return this;
    }

    _createFromHTML(html){
        const tpl = document.createElement('template');
        tpl.innerHTML = html.trim();
        return tpl.content.firstChild;
    }

    //* Drag implementation
    _dragStart(e){
        e.preventDefault();
        this._dragging = true;
        this.$container.style.transition = 'none';
        // make transparent while dragging
        this.$container.style.opacity = '0.7';

        this._startX = e.clientX;
        this._startY = e.clientY;
        const rect = this.$container.getBoundingClientRect();
        // switch to fixed positioning for consistent dragging (relative to viewport)
        this._origLeft = rect.left;
        this._origTop = rect.top;
        this.$container.style.position = 'fixed';
        this.$container.style.left = this._origLeft + 'px';
        this.$container.style.top = this._origTop + 'px';

        // pointer events handle mouse and touch
        document.addEventListener('pointermove', this._onDrag = (ev)=> this._dragMove(ev), { passive: false });
        document.addEventListener('pointerup', this._onDragEnd = (ev)=> this._dragEnd(ev));
    }

    _dragMove(e){
        if(!this._dragging) return;
        const dx = e.clientX - this._startX;
        const dy = e.clientY - this._startY;
        let newLeft = this._origLeft + dx;
        let newTop = this._origTop + dy;

        // bounds checking (stay within viewport)
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const rect = this.$container.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        newLeft = Math.min(Math.max(0, newLeft), Math.max(0, vpW - w));
        newTop = Math.min(Math.max(0, newTop), Math.max(0, vpH - h));

        this.$container.style.left = newLeft + 'px';
        this.$container.style.top = newTop + 'px';
    }

    _dragEnd(e){
        this._dragging = false;
        this.$container.style.opacity = '';
        this.$container.style.transition = '';
        document.removeEventListener('pointermove', this._onDrag, { passive: false });
        document.removeEventListener('pointerup', this._onDragEnd);

        // persist position and size
        this._writeState();
    }

    //* Resize implementation
    _resizeStart(e){
        e.preventDefault();
        this._resizing = true;
        this._resizeStartX = e.clientX;
        this._resizeStartY = e.clientY;
        const rect = this.$container.getBoundingClientRect();
        this._startWidth = rect.width;
        this._startHeight = rect.height;
        document.addEventListener('pointermove', this._onResize = (ev)=> this._resizingMove(ev));
        document.addEventListener('pointerup', this._onResizeEnd = (ev)=> this._resizeEnd(ev));
    }

    _resizingMove(e){
        if(!this._resizing) return;
        const dx = e.clientX - this._resizeStartX;
        const dy = e.clientY - this._resizeStartY;
        this.$container.style.width = Math.max(100, this._startWidth + dx) + 'px';
        this.$container.style.height = Math.max(80, this._startHeight + dy) + 'px';
    }

    _resizeEnd(e){
        this._resizing = false;
        document.removeEventListener('pointermove', this._onResize);
        document.removeEventListener('pointerup', this._onResizeEnd);
        // persist size/position
        this._writeState();
    }

    _storageKey(){
        // unique key per element id or tag
        const id = this.id || this.getAttribute('id') || 'panel-component-default';
        return `panel-state:${id}`;
    }

    _writeState(){
        try{
            const rect = this.$container.getBoundingClientRect();
            const state = {
                left: this.$container.style.left || rect.left + 'px',
                top: this.$container.style.top || rect.top + 'px',
                width: this.$container.style.width || rect.width + 'px',
                height: this.$container.style.height || rect.height + 'px'
            };
            localStorage.setItem(this._storageKey(), JSON.stringify(state));
        }catch(e){}
    }

    _readState(){
        try{
            const raw = localStorage.getItem(this._storageKey());
            if(!raw) return {};
            return JSON.parse(raw);
        }catch(e){ return {} }
    }
}

if (!customElements.get('panel-component')) {
    customElements.define('panel-component', PanelComponent);
}