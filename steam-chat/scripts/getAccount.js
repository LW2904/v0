const parse = module.exports = () => {
  const args = process.argv.slice(2)
    .map((e, i) => !(i % 2) ? e.slice(1) : e)
    .reduce((acc, val, i, a) => {
      if (!(i % 2)) acc[val] = a[i + 1]
      return acc
    }, {  })

  if (args.user && args.pass) return {
      accountName: args.user,
      password: args.pass
    }

  if (args.account && require('fs').existsSync('../../steamdata.json'))
    return require('../../../steamdata.json')[args.account]

  throw new Error('No account specified.')
}