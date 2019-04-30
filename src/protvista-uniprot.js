import { categories } from "./categories";
import { html, render } from "lit-html";

import "../styles/protvista-uniprot.css";

class ProtvistaUniprot extends HTMLElement {
  constructor() {
    super();
    this._accession = this.getAttribute("accession");
    // get properties here
  }

  connectedCallback() {
    this.loadEntry(this._accession).then(entryData => {
      this._sequence = entryData.sequence.sequence;
      // We need to get the length of the protein before rendering it
      this._render();
    });
    this.addEventListener("change", e => {
      if (e.detail.eventtype === "click") {
        this.updateTooltip(e, true);
      }
    });
    document.addEventListener("click", this._resetTooltip);
  }

  disconnectedCallback() {
    document.removeEventListener("click", this._resetTooltip);
  }

  _resetTooltip(e) {
    if (!e.target.closest(".feature")) {
      const tooltip = this.querySelector("protvista-tooltip");
      tooltip.visible = false;
      tooltip.render();
    }
  }

  async loadEntry(accession) {
    try {
      return await (await fetch(
        `https://www.ebi.ac.uk/proteins/api/proteins/${accession}`
      )).json();
    } catch (e) {
      console.log(`Couldn't load UniProt entry`, e);
    }
  }

  _render() {
    const mainHtml = () => html`
      <protvista-manager
        attributes="length displaystart displayend highlights activefilters filters"
        additionalsubscribers="uuw-litemol-component"
      >
        <protvista-navigation
          length="${this._sequence.length}"
        ></protvista-navigation>
        <protvista-sequence
          length="${this._sequence.length}"
          sequence="${this._sequence}"
        ></protvista-sequence>
        ${categories.map(
          category =>
            html`
              <div
                class="category-label"
                data-category-toggle="${category.name}"
              >
                ${category.label}
              </div>
              <div
                class="aggregate-track-content"
                data-toggle-aggregate="${category.name}"
              >
                ${this.getTrack(
                  category.trackType,
                  category.adapter,
                  category.url,
                  this.getCategoryTypesAsString(category.tracks),
                  "non-overlapping"
                )}
              </div>
              ${category.tracks.map(
                track => html`
                  <div class="track-label" data-toggle="${category.name}">
                    ${track.label
                      ? track.label
                      : this.getLabelComponent(track.labelComponent)}
                  </div>
                  <div class="track-content" data-toggle="${category.name}">
                    ${this.getTrack(
                      track.trackType,
                      category.adapter,
                      category.url,
                      track.filter,
                      "non-overlapping"
                    )}
                  </div>
                `
              )}
            `
        )}
        <protvista-sequence
          length="${this._sequence.length}"
          sequence="${this._sequence}"
        ></protvista-sequence>
        <uuw-litemol-component
          accession="${this._accession}"
        ></uuw-litemol-component>
        <protvista-tooltip />
      </protvista-manager>
    `;
    render(mainHtml(), this);
    this.querySelectorAll(".category-label").forEach(cat => {
      cat.addEventListener("click", e => {
        this.handleCategoryClick(e);
      });
    });
  }

  updateTooltip(e) {
    const d = e.detail.feature;
    if (!d.feature || !d.feature.tooltipContent) {
      return;
    }
    const tooltip = this.querySelector("protvista-tooltip");
    tooltip.left = e.detail.coords[0] + 2;
    tooltip.top = e.detail.coords[1] + 3;
    tooltip.title = `${d.feature.type} ${d.start}-${d.end}`;
    tooltip.content = d.feature.tooltipContent;
    tooltip.visible = true;
    tooltip.render();
  }

  handleCategoryClick(e) {
    const toggle = e.target.getAttribute("data-category-toggle");
    if (!e.target.classList.contains("open")) {
      e.target.classList.add("open");
    } else {
      e.target.classList.remove("open");
    }
    this.toggleOpacity(this.querySelector(`[data-toggle-aggregate=${toggle}]`));
    this.querySelectorAll(`[data-toggle=${toggle}]`).forEach(track =>
      this.toggleVisibility(track)
    );
  }

  toggleOpacity(elt) {
    if (elt.style.opacity === "" || parseInt(elt.style.opacity) === 1) {
      elt.style.opacity = 0;
    } else {
      elt.style.opacity = 1;
    }
  }

  toggleVisibility(elt) {
    if (elt.style.display === "" || elt.style.display === "none") {
      elt.style.display = "block";
    } else {
      elt.style.display = "none";
    }
  }

  getCategoryTypesAsString(tracks) {
    return tracks.map(t => t.filter).join(",");
  }

  getAdapter(adapter, url, trackTypes) {
    // TODO Allow injection of static content into templates https://github.com/Polymer/lit-html/issues/78
    switch (adapter) {
      case "protvista-feature-adapter":
        return html`
          <protvista-feature-adapter filters="${trackTypes}">
            <data-loader>
              <source src="${url}${this._accession}" />
            </data-loader>
          </protvista-feature-adapter>
        `;
      case "protvista-structure-adapter":
        return html`
          <protvista-structure-adapter>
            <data-loader>
              <source src="${url}${this._accession}" />
            </data-loader>
          </protvista-structure-adapter>
        `;
      case "protvista-proteomics-adapter":
        return html`
          <protvista-proteomics-adapter filters="${trackTypes}">
            <data-loader>
              <source src="${url}${this._accession}" />
            </data-loader>
          </protvista-proteomics-adapter>
        `;
      case "protvista-variation-adapter":
        return html`
          <protvista-variation-adapter>
            <data-loader>
              <source src="${url}${this._accession}" />
            </data-loader>
          </protvista-variation-adapter>
        `;
      default:
        console.log("No Matching ProtvistaAdapter Found.");
        break;
    }
  }

  getLabelComponent(name) {
    switch (name) {
      case "protvista-filter":
        return html`
          <protvista-filter style="minWidth: 20%"></protvista-filter>
        `;
    }
  }

  getTrack(trackType, adapter, url, trackTypes, layout = "") {
    // TODO Allow injection of static content into templates https://github.com/Polymer/lit-html/issues/78
    switch (trackType) {
      case "protvista-track":
        return html`
          <protvista-track length="${this._sequence.length}" layout="${layout}">
            ${this.getAdapter(adapter, url, trackTypes)}
          </protvista-track>
        `;
      case "protvista-variation":
        return html`
          <protvista-variation length="${this._sequence.length}">
            ${this.getAdapter(adapter, url, trackTypes)}
          </protvista-variation>
        `;
      case "protvista-variation-graph":
        return html`
          <protvista-variation-graph length="${this._sequence.length}">
            ${this.getAdapter(adapter, url, trackTypes)}
          </protvista-variation-graph>
        `;
      default:
        console.log("No Matching ProtvistaTrack Found.");
        break;
    }
  }
}

export default ProtvistaUniprot;
