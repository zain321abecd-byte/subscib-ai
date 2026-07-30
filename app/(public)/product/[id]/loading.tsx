/**
 * Instant skeleton shown while the product page's server data loads —
 * mirrors the real pl-pd layout (media + title block on the left, buy
 * box + trust chips + seller card on the right) so the swap to real
 * content doesn't shift anything. Next renders this the moment the
 * customer clicks a product link; the page streams in behind it.
 */
export default function ProductLoading() {
  // NOTE: not `product-detail-skeleton` — that legacy class carries the
  // old two-column grid layout and would collapse this page.
  return (
    <section className="v2-section pl-pd-section pl-pd-skeleton" aria-busy="true" aria-label="Loading product">
      <div className="v2-container">
        {/* Breadcrumb */}
        <div className="pl-skel-crumbs">
          <span className="skeleton-block pl-skel-crumb" />
          <span className="skeleton-block pl-skel-crumb" />
          <span className="skeleton-block pl-skel-crumb wide" />
        </div>

        <div className="pl-pd-layout">
          <div className="pl-pd-main">
            <div className="pl-pd-top">
              <div className="product-detail-media-col">
                <span className="skeleton-block pl-skel-media" />
              </div>
              <div className="pl-pd-titleblock">
                <span className="skeleton-block pl-skel-title" />
                <span className="skeleton-block pl-skel-meta" />
              </div>
            </div>

            {/* Tabs */}
            <div className="pl-skel-tabs">
              <span className="skeleton-block pl-skel-tab" />
              <span className="skeleton-block pl-skel-tab" />
              <span className="skeleton-block pl-skel-tab" />
            </div>

            {/* Description lines */}
            <div className="pl-skel-desc">
              <span className="skeleton-block skeleton-line long" />
              <span className="skeleton-block skeleton-line" style={{ width: "94%" }} />
              <span className="skeleton-block skeleton-line" style={{ width: "88%" }} />
              <span className="skeleton-block skeleton-line long" />
              <span className="skeleton-block skeleton-line medium" />
              <span className="skeleton-block skeleton-line" style={{ width: "72%" }} />
              <span className="skeleton-block skeleton-line short" />
            </div>
          </div>

          <aside className="pl-pd-side">
            {/* Buy box: price row, option pills, big orange button */}
            <div className="pl-pd-buybox pl-skel-buybox">
              <span className="skeleton-block pl-skel-price" />
              <span className="skeleton-block pl-skel-option" />
              <span className="skeleton-block pl-skel-option" />
              <span className="skeleton-block pl-skel-buy" />
            </div>

            {/* Trust chips */}
            <div className="pl-pd-sidebox pl-skel-chips">
              <span className="skeleton-block pl-skel-chip" />
              <span className="skeleton-block pl-skel-chip" />
            </div>

            {/* Seller card */}
            <div className="pl-pd-sidebox pl-skel-seller">
              <span className="skeleton-block skeleton-line medium" />
              <span className="skeleton-block skeleton-line long" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
