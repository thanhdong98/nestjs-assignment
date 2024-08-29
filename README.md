<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
</p>

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Set up environment

```.env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/postgres?schema=public

EMAIL_TEMPLATE_HOST=smtp.gmail.com
EMAIL_TEMPLATE_USERNAME=<Email User>
EMAIL_TEMPLATE_PASSWORD=<Email Password>

USER_INFO_BASE_URL=https://reqres.in/api/users
IMAGE_SERVER_BASE_URL=https://reqres.in/img/faces

APP_NAME=SPECIFIC GROUP ASSIGNMENT
```

## Installation

```bash
$ yarn install
$ yarn prisma:generate
$ yarn prisma:migrate
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run dev
```

## Test

```bash
# unit tests
$ yarn run test

# test coverage
$ yarn run test:cov
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
