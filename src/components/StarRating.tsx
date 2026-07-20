import { Star } from 'lucide-react'

type Props = {
  value: number
  onChange: (value: number) => void
  label: string
}

export function StarRating({ value, onChange, label }: Props) {
  return <div className="star-rating" role="group" aria-label={`${label} rating: ${value || 'not rated'} out of 5`}>
    {[1, 2, 3, 4, 5].map(score => <button
      type="button"
      key={score}
      className={score <= value ? 'star-active' : ''}
      aria-label={`${score} out of 5 for ${label}`}
      aria-pressed={score === value}
      title={score === value ? `Clear ${label} rating` : `Rate ${label} ${score} out of 5`}
      onClick={() => onChange(score === value ? 0 : score)}
    ><Star /></button>)}
  </div>
}
