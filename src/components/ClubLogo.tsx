type Props = { variant?: 'sidebar' | 'login' }

export function ClubLogo({ variant = 'sidebar' }: Props) {
  return <div className={`club-crest club-crest-${variant}`} role="img" aria-label="Flaming Six Volleyball Club logo"><img src={`${import.meta.env.BASE_URL}flaming-six-logo.png`} alt=""/></div>
}
