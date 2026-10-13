# ABCJ Finds

**Restaurants for your Appetite.** ABCJ Finds is a restaurant directory web app where users can browse, search, add, edit, and delete restaurants, and see top-rated places at a glance.

🔗 **Live site:** https://abcj-finds-addbase.vercel.app/

## Features

- **Restaurant directory** with cards showing name, cuisine, location, rating, and contact number
- **Add, edit, and delete** restaurants (full CRUD)
- **Search, filter, and sort** by name, cuisine, location, rating, or most recently updated
- **Cuisine dropdown** that also accepts typed input
- **Ratings (1 to 5)** and featured **Top-rated** restaurants
- **Dashboard stats** with total restaurants, recent updates (last 7 days), and average rating
- **Input validation** (for example, PH mobile number format such as `09171234567`)

## Pages

| Page | Description |
| --- | --- |
| Home | Hero section, dashboard, top-rated restaurants, latest updates |
| Restaurants | Restaurant cards with edit and delete options |
| Add Restaurant | Form for adding a new restaurant |
| About | The developers behind the project |

## Tech Stack

**Frontend:** HTML, CSS, JavaScript (served from `public/`)
**Backend:** Node.js and Express
**Database:** MongoDB (MongoDB Atlas)
**Deployment:** Vercel

## Project Structure

```
ABCJ-Finds/
├── data/            # Restaurant data
├── public/          # Frontend (HTML, CSS, JS)
├── .env.example     # Sample environment variables
├── .gitignore
├── package.json
├── package-lock.json
└── server.js        # Express server and REST API
```

## Getting Started

- [Node.js] v18 or higher
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/justineenriquez/ABCJ-Finds.git
   cd ABCJ-Finds
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up your environment variables**

   Copy `.env.example` to `.env` and fill in your own values:

   ```bash
   cp .env.example .env
   ```

   | Variable | Description |
   | --- | --- |
   | `MONGODB_URI` | Your MongoDB connection string |
   | `DB_NAME` | Database name (defaults to `dbRestaurants`) |
   | `PORT` | Port for the server (defaults to `3000`) |

   > Never commit your `.env` file.

4. **Start the server**

   ```bash
   npm start
   ```

5. **Open the app** at http://localhost:3000
