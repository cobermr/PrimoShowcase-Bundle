import {html, LitElement} from "lit";
import {until} from 'lit-html/directives/until.js';
import {customElement, property, state} from "lit/decorators.js";
import {register} from 'swiper/element/bundle';
import {PnxCard} from "./pnx-card";

register();

@customElement('search-carousel')
export class SearchCarousel extends LitElement {
    @property() searchUrl: string = '';
    @property() titleText: string | undefined;
    @property() titleLink: string | undefined;
    @property() defaultThumbnailUrl: string | undefined;

    @state()
    private data: any;
    private viewId!: string | null;
    private language!: string | null;
    private scope!: string | null;
    private tab!: string | null;
    private institution!: string | null;
    private host!: string | null;
    private originalAriaLabelList: string[] = [];
    private firstLoad = true;
    private isNeedToChangeAriaLabel = false;

    constructor() {
        super();
        PnxCard;
        //This is for the bundler so it packages the other components with this one

    }

    override connectedCallback() {
        super.connectedCallback();
        this.performQuery();
    }

    async performQuery() {
        try {
            const response = await fetch(this.searchUrl);
            this.data = response.json();
        } catch (error) {
        }


    }

    //disables shadow root for lit element otherwise swiper styling doesn't work properly
    protected override createRenderRoot() {
        return this;
    }


    override render() {
        if (!this.data) {
            return html``;
        }
        const parsedUrl = new URL(this.searchUrl);
        this.host = parsedUrl.host;
        this.viewId = parsedUrl.searchParams.get("vid");
        this.language = parsedUrl.searchParams.get("lang")
        this.scope = parsedUrl.searchParams.get("scope")
        this.tab = parsedUrl.searchParams.get("tab")
        this.institution = parsedUrl.searchParams.get("inst")

        const titleHtml = this.getTitleHtml();


        const docsPromise = this.data.then((data: any) => data.docs.map((doc: any) =>
            html`
                <swiper-slide .doc="${doc}">
                    <pnx-card .doc="${doc}" .host="${this.host}" .institution="${this.institution}"
                              .vid="${this.viewId}"
                              .language="${this.language}" .scope="${this.scope}"
                              .tab="${this.tab}" .defaultThumbnailUrl="${this.defaultThumbnailUrl}">
                    </pnx-card>
                </swiper-slide>`))

        return html`

            <div class="gallery-container" id="showcase">
                <a href="#showcase-link" class="showcaseSkip" part="skip">Skip this section</a>
                <button @click="${this.activateChangeAriaLabel}" class="swiper-button-prev"></button>
                <swiper-container init="false" class="swiper">
                    ${until(docsPromise, ``)}
                </swiper-container>
                <!-- Navigation buttons -->
                <button @click="${this.activateChangeAriaLabel}" class="swiper-button-next"></button>
                ${titleHtml}
            </div>
        `;
    }

    protected override updated() {
        const swiperEl = this.renderRoot.querySelector('swiper-container') as HTMLElement & { swiper: any };
        const nextEl = this.renderRoot.querySelector('.swiper-button-next');
        const prevEl = this.renderRoot.querySelector('.swiper-button-prev');
        const paginationEl = this.renderRoot.querySelector('.swiper-pagination');
        if (!swiperEl) {
            return;
        }


        const params = {
            // inject same style to shadow DOM
            effect: "coverflow",
            grabCursor: true,
            centeredSlides: true,
            // slidesPerView: "4",
            spaceBetween: 70,
            slidesPerView: "auto",
            // loop: true,
            coverflowEffect: {
                rotate: 25,
                stretch: 0,
                depth: 100,
                modifier: 1,
                slideShadows: false,
            },
            pagination: {
                el: paginationEl,
                clickable: true
            },
            // Responsive breakpoints
            breakpoints: {
                360: {
                    slidesPerView: 2,
                    spaceBetween: 30,
                },
                640: {
                    slidesPerView: 3,
                    spaceBetween: 100,
                },
                768: {
                    slidesPerView: 3,
                    spaceBetween: 130,
                },
                1024: {
                    slidesPerView: "auto",
                    spaceBetween: 70,
                },
            },
            // Navigation arrows
            navigation: {
                nextEl: nextEl,
                prevEl: prevEl,
            },
            // Accessibility
            a11y: {
                prevSlideMessage: 'Previous slide',
                nextSlideMessage: 'Next slide',
                firstSlideMessage: 'This is the first slide',
                lastSlideMessage: 'This is the last slide'
            },
            on: {
                // This event triggers when the slide changes
                slideChange: () => {
                    if (this.isNeedToChangeAriaLabel) {
                        const slides = swiperEl.querySelectorAll('swiper-slide') as NodeListOf<HTMLElement>;
                        const activeSlide = slides[swiperEl.swiper.activeIndex];

                        // Reset all slides' aria-live to 'polite'
                        slides.forEach((slide: HTMLElement, index: number) => {

                            // This is keep the original default aria-label
                            if (this.firstLoad) {
                                const currentLabel = slide.getAttribute('aria-label') || '';
                                this.originalAriaLabelList.push(currentLabel);
                            }

                            // Get the current aria-label
                            slide.setAttribute('aria-live', 'off');
                            if (index !== swiperEl.swiper.activeIndex) {
                                slide.setAttribute('aria-label', this.originalAriaLabelList[index]);
                            }
                        });

                        // This boolean is for the first initialization of original aria-label list
                        this.firstLoad = false;

                        // Set the active slide's aria-live to 'assertive'
                        if (activeSlide) {
                            activeSlide.setAttribute('aria-live', 'assertive');

                            // Get the current aria-label
                            const currentLabel = activeSlide.getAttribute('aria-label') || '';

                            // Append dynamic content, e.g., the current slide number or a custom message
                            const additionalText = (activeSlide as any)?.doc?.pnx?.display?.title?.[0] + (activeSlide as any)?.doc?.pnx?.display?.publisher?.[0] ?? '';

                            const labelToReturn = (currentLabel.includes(additionalText)) ? (`${currentLabel}`) : (`${currentLabel} - ${additionalText}`);

                            // Update the aria-label attribute with the new text
                            activeSlide.setAttribute('aria-label', labelToReturn);
                        }

                        this.isNeedToChangeAriaLabel = false;
                    }
                }
            },
            injectStyles: [
                `
                     search-carousel {
                        position: relative;
                        height: 100%;
                        display: block;
                        font-size: 14px;
                        color: #000;
                        padding: 0;
                        --width-param: 700px;
                        max-width: var(--width-param);
                        margin: 0 auto;
                     }
                    .gallery-container {
                        padding: 20px;
                    }
                    
                    .gallery-container a {
                        text-decoration: none;
                        color: black;
                    }
                    
                    .gallery-container a:hover, .gallery-container a:focus {
                        text-decoration: underline;
                    }
                    
                    .gallery-container p.browseLink {
                        text-align: center;
                    }
                    
                    .swiper {
                        max-width: var(--width-param);
                        margin-block-end: 1em;
                    }
                    
                    swiper-slide {
                        background-position: center;
                        background-size: cover;
                        width: calc(0.2 * var(--width-param));
                        text-decoration: none;
                    }
                    
                    swiper-slide:hover, swiper-slide:focus {
                        text-decoration: underline;
                    }
                    
                    .swiper-slide img {
                        display: block;
                    }
                    
                    
                    .gallery-container .swiper-button-prev, .gallery-container .swiper-button-next {
                        color: black;
                        background-color: transparent;
                        border: none;
                        top: 50%;
                        padding: 0;
                    }
                    .gallery-container .swiper-button-next {
                        margin-right: -2.5em;
                    }

                    .gallery-container .swiper-button-prev {
                        margin-left: -2.5em;
                    }
                    @media only screen and (max-width: 360px) {
                        .gallery-container .swiper-button-next {
                            margin-inline-end: -13px;
                        }
                        .gallery-container .swiper-button-prev {
                            margin-inline-start: -13px;
                        }
                        /*.swiper-button-prev:focus:not(:active), .swiper-button-next:focus:not(:active) {
                        box-shadow: 0 0 0 2px black;
                        }*/
                    }
                    
                    /*.swiper-button-prev:focus, .swiper-button-next:focus {
                        // box-shadow: 0 0 0 2px black;
                    }*/
                    
                    .swiper-button-prev, .swiper-button-next {
                        &:hover,&:focus {
                            background-color: black;
                            &:after {
                            color: white;
                            }
                        }
                    }
                    
                    .swiper-pagination .swiper-pagination-bullet-active {
                        background-color: black;
                    }
                    
                    .swiper-pagination-horizontalswiper-pagination-bullets .swiper-pagination-bullet{
                        --swiper-pagination-bullet-horizontal-gap: 8px;
                    }
            `,
            ],

        }
        Object.assign(swiperEl, params);
        // @ts-ignore
        swiperEl.initialize();
    }

    private activateChangeAriaLabel() {
        this.isNeedToChangeAriaLabel = true;
    }

    private getTitleHtml() {
        if (this.titleText) {
            return this.titleLink ? html`<p class="browseLink" id="showcase-link"><a target="_blank" href="${this.titleLink}">Browse more ${this.titleText} books in OneSearch</a>
            </p>` : html`<p class="browseLink" id="showcase-link"><a target="_blank" href="https://caccl-laccd.primo.exlibrisgroup.com/discovery/search?tab=LibraryCatalog&search_scope=LAPC_LibraryCatalog&vid=01CACCL_LACCD:LAPC&offset=0">Search for books in OneSearch</a></p>`
        }
        return html``;
    }

}
