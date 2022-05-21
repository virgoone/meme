export default (a: { date: string }, b: { date: string }) => {
  if (!a.date) return -1
  if (!b.date) return -1
  return new Date(a.date) > new Date(b.date) ? -1 : 1
}
