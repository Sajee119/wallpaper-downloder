/**
 * One page header for every route: eyebrow, display title, lede, optional
 * meta line and right-aligned actions, sitting on a hairline rule.
 */
export default function PageHeader({ eyebrow, title, lede, meta, actions, children, id }) {
  return (
    <header className="page-head">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title mt-3" id={id}>
            {title}
          </h1>
          {lede ? <p className="page-lede">{lede}</p> : null}
          {meta ? <p className="meta mt-3">{meta}</p> : null}
          {children}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
