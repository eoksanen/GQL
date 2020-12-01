const { ApolloServer, UserInputError, gql } = require('apollo-server')

const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Book = require('./models/book')
const User = require('./models/user')
const config = require('./utils/config')
const bcrypt = require('bcrypt')

const { PubSub } = require('apollo-server')
const pubsub = new PubSub()

console.log(process.env.MONGODB_URI)

// const MONGODB_URI = 'mongodb+srv://fullstack:halfstack@cluster0-ostce.mongodb.net/graphql?retryWrites=true'

//const MONGODB_URI = config.MONGODB_URI

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
    userCount: Int!
    allBooks(author: String, genre: String, byUserFavoriteGenre: Boolean): [Book!]!
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
    ): Book
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
  }
  type Subscription {
  bookAdded: Book!
}  
`

const resolvers = {
  Query: {
    me: async (root, args, context) => {

      return context.currentUser

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
    bookCount: () => Book.count({}),
    authorCount: () => Author.count({}),
    userCount: () => User.count({}),
    allBooks: (root, args, {currentUser}) => {
      if (!args.author && !args.genre && !args.byUserFavoriteGenre){
        console.log('TEST1')
        return Book.find({}).populate('author', { name: 1, born: 1 })
      }
      if (args.author) {
        return Book.find({"author": args.author})
      }
      if(args.genre) {
        return Book.find({"genres": { $in: args.genre}}).populate('author', { name: 1, born: 1 })
      }
      if(args.byUserFavoriteGenre){
        if (!currentUser) {
          console.log('TEST AP')
          throw new AuthenticationError("not authenticated")
        }
        if(currentUser) {
          console.log('TEST')
        return Book.find({"genres": { $in: currentUser.favoriteGenre}}).populate('author', { name: 1, born: 1 })
        }
      }
    },
    allAuthors: () => Author.find({}),
  
  },
  Mutation: {
    addBook: async (root, args, {currentUser}) => {

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      console.log('user', currentUser)

      const book = await Book.find({title: args.title})

      console.log('book ', book)

      if(currentUser){

      if(book.title){
        throw new UserInputError('Title must be unique', {
          invalidArgs: args.title,
        })
      }

      const author = await Author.find({name: args.author})
      const authorOne = await Author.findOne({name: args.author})
      console.log('authorOne ', authorOne) 
      console.log('author ', author)
      console.log('ANMANE',author[0] ? author[0].name : null)

      let bookMG

      if(!(author[0] ? author[0].name : null)){
        const newAuthor = {
          name: args.author,
          born: args.born ? args.born : null
        }
        const authorToMongo = new Author({...newAuthor})
    
       delete args.token
       delete args.author
        args.author = authorToMongo

      console.log('arsgNew ', args)
      if(authorToMongo.name.length < 3) {
       throw new UserInputError('Authors name minium lengt is 3 letters')
      } else {
          authorToMongo.save()
      }
       
    } else {
      delete args.token
      args.author = authorOne._id
      console.log('bookMG2 ', bookMG)
    }
    bookMG = new Book({...args})


      if(bookMG.title.length < 2) {
       throw new UserInputError('Book title minium lengt is 2 letters')
      } else {
        pubsub.publish('BOOK_ADDED', { bookAdded: bookMG })
        bookMG.save()

      return bookMG.populate('author', { name: 1, born: 1 }).execPopulate()
      
      
      }
    }
    
    },
    createUser: async (root, args, {currentUser} ) => {

      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      console.log('user', currentUser)
  
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      })
      return user.save()
      .catch(error => {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      })

    },
    login: async ( root, args ) => {
      console.log('args ',args, '/n password')
      const user = await User.findOne({ username: args.username})
      console.log('user ', user)

      if ( !user || args.password !== 'secret' ) {
        throw new UserInputError("wrong credentials")
      }
      
    const userForToken = {
      username: user.username,
      id: user._id,
    }

    return { value: jwt.sign(userForToken, process.env.SECRET) }

    },
    
    editAuthor: async (root, args, {currentUser}) => {


      if (!currentUser) {
        throw new AuthenticationError("not authenticated")
      }
      console.log('user', currentUser)

      const author = await Author.find({name: args.name})
      if (!author) {
        return null
      }
      console.log('author ', author)


      const editedAuthor = { born: args.setBornTo }

      console.log('Edited author id', author[0]._id)
      const updatedAuthor  = await Author.findByIdAndUpdate(author[0]._id, editedAuthor, { new: true, useFindAndModify: false })

      console.log('updated author ', updatedAuthor)
      return updatedAuthor
    }   
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator(['BOOK_ADDED'])
    },
  },
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), process.env.SECRET
      )
      const currentUser = await User
        .findById(decodedToken.id).populate('friends')
      return { currentUser }
    }
  }
})

server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`)
  console.log(`Subscriptions ready at ${subscriptionsUrl}`)
})

