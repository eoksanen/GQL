const { ApolloServer, UserInputError, gql } = require('apollo-server')

const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Book = require('./models/book')
const User = require('./models/user')
const config = require('./utils/config')
const bcrypt = require('bcrypt')

console.log(process.env.MONGODB_URI)

// const MONGODB_URI = 'mongodb+srv://fullstack:halfstack@cluster0-ostce.mongodb.net/graphql?retryWrites=true'

const MONGODB_URI = config.MONGODB_URI

console.log('connecting to', MONGODB_URI)

mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })


const { v1: uuid } = require('uuid')
const Author = require('./models/Author')

let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
]

/*
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
*/

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]

const typeDefs = gql`
type User {
  username: String!
  favoriteGenre: String!
  id: ID!
}

type Token {
  value: String!
}

  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
}
  type Book {

    title: String!
    published: Int
    author: Author!
    id: ID!
    genres: [String]

}
  type Query {
    me: User
    addAll: String
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors: [Author!]!
  }
  type Mutation {
    createUser(
    username: String!
    favoriteGenre: String!
  ): User
  login(
    username: String!
    password: String!
  ): Token
    addBook(
      title: String!
      author: String!
      born: Int
      published: Int!
      genres: [String!]
      token: Token!
    ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
      token: Token!
    ): Author
  }
`

const resolvers = {
  Query: {
    me: (root, args) => {
      const decodedToken = jwt.verify(args.token, process.env.SECRET)
      console.log(decodedToken)
     // User.find({})
    },
    addAll: () => {
      authors.map(a => {
        const addedAuthor = new Author({...a})
        const writtenBooks = books.filter(b => b.author === addedAuthor.name)
        const writtenbookswithAuthorID = writtenBooks.map(wb => {
          wb.author = addedAuthor.id
          return wb
        } )
        console.log('Author ', addedAuthor, '/n', 'books ', writtenBooks)

        addedAuthor.save()
        writtenbookswithAuthorID.map(wbwau => {
         const bookToMongo = new Book({...wbwau})
        bookToMongo.save()
        })
      })
    },
    bookCount: () => books.length,
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      if (!args.author && !args.genre){
        return Book.find({})
      }
      if (args.author) {
        return Book.find({"author": args.author})
      }
      if(args.genre) {
        return Book.find({"genres": { $in: args.genre}})
      }
    },
    allAuthors: () => Author.find({}),
  
  },
  Mutation: {
    addBook: (root, args) => {
      if(args)
      if (books.find(b => b.title === args.title)) {
        throw new UserInputError('Title must be unique', {
          invalidArgs: args.title,
        })
      }

      if(authors.find(a => a.name !== args.author)){
        const newAuthor = {
          name: args.author,
          id: uuid(),
          born: args.born ? args.born : null
        }
        authors = authors.concat(newAuthor)
        const authorToMongo = new Author({...newAuthor})
        
        //authorToMongo.save()
      }
      
      const book = { ...args, id: uuid() }
      books = books.concat(book)

      console.log('arsg ', args)

      const newAuthor = {
        name: args.author,
        id: uuid(),
        born: args.born ? args.born : null
      }
      authors = authors.concat(newAuthor)
      const authorToMongo = new Author({...newAuthor})

      delete args.author



      args.author = authorToMongo

      console.log('arsg ', args)
      if(authorToMongo.name.length < 4) {
       throw new UserInputError('Authors name minium lengt is 4 letters')
      } else {
          authorToMongo.save()

      }

      
      const bookMG = new Book({...args})

      console.log('arsg ', args)
      if(bookMG.title.length < 2) {
       throw new UserInputError('Book title minium lengt is 2 letters')
      } else {
      return bookMG.save()
      }
    },
    createUser: async (root, args ) => {
  
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      })
      const savedUser = user.save()

      return savedUser

    },
    login: async ( root, args ) => {
      console.log('args ',args, '/n password')
      const user = await User.findOne({ username: args.username})
      console.log('user ', user)
      /*
      const passwordCorrect = user === null
      ? false
      : await bcrypt.compare(password, user.passwordHash)
      console.log(passwordCorrect)
    if (!(user && passwordCorrect)) {
      throw new Error('invalid username or password')
    }
*/
if(!user){
  throw new Error('User not found')
} else {


    const userForToken = {
      username: user.username,
      id: user._id,
    }

  console.log('printed TOKEN: ',request.token)
  const decodedToken = jwt.verify(request.token, process.env.SECRET)
  const token = jwt.sign(userForToken, process.env.SECRET)
  console.log('token ', token)

  return { value: token }

}

    },
    
    editAuthor: (root, args) => {

      console.log('printed TOKEN: ',args.token)
      const decodedToken = jwt.verify(args.token, process.env.SECRET)

      if (!args.token || !decodedToken.id) {
        return response.status(401).json({ error: 'token missing or invalid' })
      }

      const author = Author.find({name: args.name})
      if (!author) {
        return null
      }
      const user = User.find({id: decodedToken.id})
      console.log('user', user)

      if(decodedToken.id.toString() === args.user.id.toString()){
  
      const updatedAuthor = { ...author, name: args.name, born: args.setBornTo }
      authors = authors.map(a => a.name === args.name ? updatedAuthor : a)
      return updatedAuthor
    }   
  },
  }

  /*
  Author: {
    bookCount(author) {

      console.log(books.filter(book => book.author === author.name).length)

      return books.filter(book => book.author === author.name).length
    },
  },
  */
}


const server = new ApolloServer({
  typeDefs,
  resolvers,
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})

