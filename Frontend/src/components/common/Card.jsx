import { cn } from '../../utils/cn';

function Card({ title, subtitle, action, className, children }) {
  return (
    <section className={cn('surface-card p-4 md:p-5', className)}>
      {(title || subtitle || action) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title ? <h3 className="section-title">{title}</h3> : null}
            {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export default Card;
