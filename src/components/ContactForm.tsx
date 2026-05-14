type Props = {
  locale: 'es' | 'en';
  title: string;
  fields: {
    name: string;
    company: string;
    email: string;
    message: string;
  };
  cta: string;
  classNames: {
    card: string;
    row: string;
    field: string;
    submit: string;
  };
};

export function ContactForm({ locale, title, fields, cta, classNames }: Props) {
  return (
    <form className={classNames.card} action="/api/lead" method="post">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="source" value="cinematic-site" />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: 'none' }} />
      {title ? <h3>{title}</h3> : null}
      <div className={classNames.row}>
        <div className={classNames.field}>
          <label htmlFor="name">{fields.name}</label>
          <input id="name" name="name" required autoComplete="name" />
        </div>
        <div className={classNames.field}>
          <label htmlFor="company">{fields.company}</label>
          <input id="company" name="company" autoComplete="organization" />
        </div>
        <div className={classNames.field}>
          <label htmlFor="email">{fields.email}</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className={classNames.field}>
          <label htmlFor="message">{fields.message}</label>
          <textarea id="message" name="message" required />
        </div>
      </div>
      <button className={classNames.submit} type="submit">
        {cta}
      </button>
    </form>
  );
}
