import Link from 'next/link';

type Props = {
  label: string;
  text: string;
  href: string;
  classNameLabel: string;
  classNameLink: string;
};

export function LanguageSwitcher({ label, text, href, classNameLabel, classNameLink }: Props) {
  return (
    <>
      <span className={classNameLabel}>{label}</span>
      <Link href={href} className={classNameLink}>
        {text}
      </Link>
    </>
  );
}
