import { Fast } from './Fast/Fast.js';

export class PanelComponent extends Fast {
    constructor(props) {
        super(props);
        this.built = () => {}
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
}

if (!customElements.get('panel-component')) {
    customElements.define('panel-component', PanelComponent);
}