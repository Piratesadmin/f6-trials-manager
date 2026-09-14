type Props = { variant?: 'sidebar' | 'login' }

export function ClubLogo({ variant = 'sidebar' }: Props) {
  const publicRoot=window.location.pathname.replace(/(?:signup|welfare)\/?$/,'').replace(/\/?$/,'/')
  return <div className={`club-crest club-crest-${variant}`} role="img" aria-label="Flaming Six Volleyball Club logo"><img src={`${publicRoot}flaming-six-logo.png`} alt=""/></div>
}
