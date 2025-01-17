# GraphQL Profile Page

This project creates a profile page that displays your school information using GraphQL queries. It features interactive graphs created with D3.js and SVG.

## Features

- Secure login with JWT authentication
- Display of basic user information
- XP progress tracking
- Audit statistics
- Interactive graphs:
  - XP earned over time (line graph)
  - Project pass/fail ratio (donut chart)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

## Technology Stack

- GraphQL for data fetching
- D3.js for interactive SVG graphs
- JWT for authentication
- Parcel for bundling
- Modern CSS with CSS Grid and Flexbox

## Project Structure

```
graphql-profile/
├── src/
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   ├── graphql.js     # GraphQL client utility
│   │   └── graphs.js      # D3.js graph rendering
│   ├── index.html         # Main HTML file
│   └── styles.css         # Stylesheet
├── package.json           # Project dependencies and scripts
└── README.md             # Project documentation
```
