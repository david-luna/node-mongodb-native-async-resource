# MongoDB Async context tracing issue

The goal of this repository is to showcase an issue APM libraries (like Elastic APM or OpenTelemetry)
are facing when instrumenting MongoDB commands and propose a solution.

The issue is that the async context for a MongoDB command is *lost* when it is enqueued on the
mongodb driver's internal queue (XXX a link to relevant node-mongodb-native source would be useful here).
This means that the [Node.js mechanisms for tracking async context](https://nodejs.org/api/async_context.html) -- that
are used by these APM libraries for tracing -- often get the wrong async context when a command is eventually executed.

Node.js provides an API for libraries to use to preserve this context: [`AsyncResource.bind`](https://nodejs.org/api/async_context.html#static-method-asyncresourcebindfn-type-thisarg).


# Demo time


## Requirements

To work with this repo and reproduce the error you need
- NodeJS v18.16.0+
- Docker

## Issue repro

In order to reproduce the issue you have to follow these steps:

- install dependencies by running `npm install`
- spawn a mongodb instance by running `npm run mongodb:start`
- start the server with the APM setup of your choice `npm run server:${apm-setup}`
  - `otel` is for Opentelemetry
  - `elastic` id for Elastic APM agent
- in a new terminal send traffic by running `npm run requests`
- once command has finished wait for about `5-10s`
- print results with the command `npm run print ${apm-setup}`
  - note: you should pass the same setup value you used to start the server

This is a sample of the ouptput you should see on the terminal. 

```
# trace showing an HTTP span with a child mongodb span
trace 972b1f0642f66fa43acc4ffc22
`- span 92ca036f9f "GET" (http://localhost:3000/create -> 200)
   `- span e1562a74a1 "mongodb.insert" (mongodb)
trace f171c14cd835be00756286704d
`- span 5a63547023 "GET" (http://localhost:3000/create -> 200)
   `- span a7b31fc1aa "mongodb.insert" (mongodb)
# trace showing an HTTP span with many child mongodb spans
trace 849ab3d2ef2495d3f534857f15
`- span dda9f31138 "GET" (http://localhost:3000/getAll -> 200)
   `- span ed2617f2e8 "mongodb.find" (mongodb)
   `- span 4b45a9ddc6 "mongodb.find" (mongodb)
   `- span f665493f0c "mongodb.find" (mongodb)
   `- span 2e9bb504a8 "mongodb.find" (mongodb)
# trace showing an HTTP span with no child mongodb spans for the same URL
trace 217e66fc7585d4b3fa3326cf91
`- span 99af5dc34b "GET" (http://localhost:3000/getAll -> 200)
```


## Fix it

There is a dedicated branch with the fix at https://github.com/david-luna/node-mongodb-native/tree/build-5.x
so you can install it directly by running `npm install david-luna/node-mongodb-native#build-5.x --save`

Once the installation is complete follow the steps from the section above and you will see printed the
difference in the span hierarchy (each HTTP span will have it mongodb child span)
