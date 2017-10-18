let raw = [ 0, 4, 0, 0, 8, 3, 0, 6, 0, 6, 0, 7, 0, 0, 0, 4, 0, 0, 3, 0, 0, 0, 6, 0, 2, 9, 0, 0, 0, 4, 0, 1, 0, 9, 2, 6, 9, 0, 0, 0, 3, 0, 0, 0, 8, 8, 2, 6, 0, 7, 0, 5, 0, 0, 0, 7, 9, 0, 5, 0, 0, 0, 2, 0, 0, 2, 0, 0, 0, 3, 0, 9, 0, 6, 0, 1, 9, 0, 0, 7, 0 ]

class Sudoku {
  constructor (raw) {
    this._raw = raw
  }

  get raw () { return this._raw }
  get rows () { return this.getRows() }
  get cols () { return this.getColumns() }
  get cubes () { return this.getCubes() }

  static rowsToRaw (rows) {
    let a = [ ]
    for (let row of this.rows) a = a.concat(row)
    return a
  }

  getRows () {
    let a = [ ]
    let r = this.raw

    for (let i = 0; i < 9; i++) {
      if (!a[i]) a[i] = []

      let s = r.splice(0, 9)
      for (let ii in s) a[i].push(s[ii])
    }

    return a
  }

  getColumns () {
    let a  = [  ]

    for (let i = 0; i < 9; ++i) {
      a.push([  ])
      console.log(i)
      for (let ii = 0; ii < 9; ++ii) {
        a[i].push(this.cols[ii][i])
      }
    }

    return a
  }

  getCubes () {
    let a = [  ]
    let o = 0

    for (let i = 0; i < 9; i++) {
      a.push([  ])

      for (let ii = 0; ii < 3; ii++) {
        this.raw.slice(o + (ii * 9), o + (ii * 9) + 3).map(e => a[i].push(e))
      }

      o += 3
    }
    return a
  }

  isSolved () {
    for (let cube of this.cubes)
      if (cube.reduce((a, c) => a + c) !== 9) return false

    for (let row of this.rows)
      if (row.reduce((a, c) => a + c) !== 9) return false
  }
}

let sudoku = new Sudoku(raw)

console.log(sudoku.cols)
