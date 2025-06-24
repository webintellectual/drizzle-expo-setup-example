### **Have an expo project ready**

- `$ npx create-expo-app@latest`
- Go to the root directory of project and run: `$ npm run reset-project`
- Make `src` directory in project root and shift `app` and `asset` to `src`
- Update `app.json`

### Writing Database Schema

1. **Install `drizzle-orm` — The Runtime Library**
    - **What it is**: A TypeScript ORM that runs in your app (e.g., React Native with Expo, Node.js, etc.).
    - **Purpose**: It provides a **type-safe query builder** and handles actual database interactions (like `select`, `insert`, `update`, `delete`).
    - **When it runs**: **At runtime** — in your production app code.
    
    You need this to write and run queries in your app.
    
    **`$ npm i drizzle-orm`**
    
2. **Write schema of your database using `drizzle-orm`**
    
    Create `src/db/schema.ts` 
    
    ```python
    import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
    
    export const users = sqliteTable("users", {
      id: integer("id").primaryKey(),
      name: text("name").notNull(),
      email: text("email").notNull(),
    });
    
    ```
    

### Setting Up configuration files

1. **Setup babel config**
    
    `$ npm install babel-plugin-inline-import`
    
    `$ npx expo customize babel.config.js`  (Skip this if you already have this file present)
    
    ```jsx
    // babel.config.js
    
    module.exports = function(api) {
      api.cache(true);
    
      return {
        presets: ['babel-preset-expo'],
        plugins: [["inline-import", { "extensions": [".sql"] }]] // <-- add this
      };
    };
    ```
    
    Purpose of this setting:
    
    The `babel-plugin-inline-import` plugin allows you to import the contents of files (like `.sql`, `.graphql`, `.txt`, etc.) directly as strings within your JavaScript or TypeScript code. This is particularly useful for Drizzle ORM, which generates SQL migration files that need to be bundled into your application.
    
2. Setup Metro config
    
    `$ npx expo customize metro.config.js` (Skip this command if this file is already present in your project’s root)
    
    ```jsx
    // metro.config.js
    
    const { getDefaultConfig } = require('expo/metro-config');
    
    /** @type {import('expo/metro-config').MetroConfig} */
    const config = getDefaultConfig(__dirname);
    
    config.resolver.sourceExts.push('sql'); // <--- add this
    
    module.exports = config;
    ```
    
    By default, Metro only processes specific file extensions (like `.js`, `.jsx`, `.ts`, `.tsx`). Drizzle ORM generates `.sql` files for database migrations, which need to be bundled with your application. To ensure Metro recognizes and includes these `.sql` files during the bundling process, you need to explicitly add the `.sql` extension to the `sourceExts` array in your `metro.config.js`.
    
    This configuration tells Metro to treat `.sql` files as source files, allowing them to be imported and used within your JavaScript or TypeScript code.
    
3. **Install `drizzle-kit` — The CLI & Migration Tool**
    - **What it is**: A development-time tool that generates migration SQL files and TypeScript types from your schema.
    - **Purpose**: Helps you:
        - Generate migration files (e.g., `CREATE TABLE` SQL)
        - Sync your schema to the database
        - Generate types that `drizzle-orm` uses
    - **When it runs**: **Only during development**, via the CLI.
    - You need this for:
        - Setting up your schema safely
        - Keeping your database and code in sync
        - Using Drizzle Studio (which reads the generated schema)
    
    `$ **npm i -D drizzle-kit`** 
    
4. **Create config file for drizzle kit and link db schema file there**
    
    A configuration file that is used by [Drizzle Kit](https://orm.drizzle.team/docs/kit-overview) and contains all the information about your database connection, migration folder and schema files.
    
    Create a file named `drizzle.config.ts` at the root of your project:
    
    ```jsx
    // drizzle.config.ts
    
    import type { Config } from 'drizzle-kit';
    
    export default {
    	schema: './src/db/schema.ts',
    	// schema file is linked in the drizzle.config.ts so 
    	// that drizzle kit can use it to migrate schema.
    	
    	out: './drizzle',
      dialect: 'sqlite',
    	driver: 'expo', // <--- very important
    } satisfies Config;
    ```
    

### Generating Migrations (Converting schema written in TS to actual .sql file)

`$ npx drizzle-kit generate` . It creates migration files in the `drizzle/` folder.

<aside>
💡

Every time you change the schema of you database you need to run `npx drizzle-kit generate` to migrate to need schema. First time you do it for the purpose of creating initial schema.

</aside>

### Install Expo-SQLite and Create Development Build

1. Install expo sqlite: `$ npx expo install expo-sqlite` 
2. So, drizzle does not work in your expo go environment. You need to create a development build
    - `$ npx expo prebuild --platform android` or `$ npx expo prebuild --platform android` or `$ npx expo prebuild`  for both builds
    - `$ npx expo run:android`
    - Reference:
        
        [Continuous Native Generation (CNG)](https://docs.expo.dev/workflow/continuous-native-generation/)
        

### Setup Root Layout for drizzle

1. Define database name and use `openDatabaseSync` from expo-sqlite to create or open existing database with the database name defined.
    
    So far, this how your _layout.tsx will look like:
    
    ```jsx
    import { Stack } from "expo-router";
    import { openDatabaseSync } from 'expo-sqlite';
    
    export const DATABASE_NAME = 'my_db'; 
    
    export default function RootLayout() {
      const expoDb = openDatabaseSync(DATABASE_NAME);
    
      return <Stack />;
    }
    ```
    
2. Plug this db instance to drizzle
    
    ```jsx
    // _layout.tsx
    
    import { drizzle } from 'drizzle-orm/expo-sqlite';
    import { Stack } from "expo-router";
    import { openDatabaseSync } from 'expo-sqlite';
    
    export const DATABASE_NAME = 'my_db';
    
    export default function RootLayout() {
      const expoDb = openDatabaseSync(DATABASE_NAME);
      const db = drizzle(expoDb); // connect sqlite db intance to drizzle
    
      return <Stack />;
    }
    
    ```
    
3. Import the migrations which were generated using drizzle-kit and and execute the migrations using the useMigrations hook.
    
    ```jsx
    // _layout.tsx
    
    import migrations from '@/drizzle/migrations'; // import migrations generated using drizzle kit
    import { drizzle } from 'drizzle-orm/expo-sqlite';
    import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'; // hook needed to execute migrations at run time
    import { Stack } from "expo-router";
    import { openDatabaseSync } from 'expo-sqlite';
    
    export const DATABASE_NAME = 'my_db';
    
    export default function RootLayout() {
      const expoDb = openDatabaseSync(DATABASE_NAME);
      const db = drizzle(expoDb);
      const { success, error } = useMigrations(db, migrations); // snippet to execute migrations at run time
    	
    	if (error) console.error("Migration error", error);
      if (success) console.log("Migration success");
    
      return <Stack />;
    }
    
    ```
    
4. Provide access to the DB to your entire app using SQLIteProvider
    
    ```jsx
    import migrations from '@/drizzle/migrations';
    import { drizzle } from 'drizzle-orm/expo-sqlite';
    import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
    import { Stack } from "expo-router";
    import { openDatabaseSync, SQLiteProvider } from 'expo-sqlite';
    
    export const DATABASE_NAME = 'my_db';
    
    export default function RootLayout() {
      const expoDb = openDatabaseSync(DATABASE_NAME);
      const db = drizzle(expoDb);
      const { success, error } = useMigrations(db, migrations);
      
      if (error) console.error("Migration error", error);
      if (success) console.log("Migration success");
    
      return (
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          options={{ enableChangeListener: true }}
        >
          <Stack />
        </SQLiteProvider>
      );
    }
    ```
    
5. Apply suspense
    
    ```jsx
    import migrations from '@/drizzle/migrations';
    import { drizzle } from 'drizzle-orm/expo-sqlite';
    import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
    import { Stack } from "expo-router";
    import { openDatabaseSync, SQLiteProvider } from 'expo-sqlite';
    import { Suspense } from 'react';
    import { ActivityIndicator } from 'react-native';
    
    export const DATABASE_NAME = 'my_db';
    
    export default function RootLayout() {
      const expoDb = openDatabaseSync(DATABASE_NAME);
      const db = drizzle(expoDb);
      const { success, error } = useMigrations(db, migrations);
      
      if (error) console.error("Migration error", error);
      if (success) console.log("Migration success");
    
      return (
        <Suspense fallback={<ActivityIndicator size="large" />}>
          <SQLiteProvider
            databaseName={DATABASE_NAME}
            options={{ enableChangeListener: true }}
          >
            <Stack />
          </SQLiteProvider>
        </Suspense>
      );
    }
    ```
    

### Make a custom hook that can be used to get the drizzle connection anywhere in your app

1. Make `/src/hooks/drizzleConnection.ts`
    
    ```jsx
    import { drizzle } from "drizzle-orm/expo-sqlite";
    import { useSQLiteContext } from "expo-sqlite";
    import * as schema from "../db/schema";
    
    export function useDrizzle() {
      const expoDb = useSQLiteContext();
      return drizzle(expoDb, { schema });
    }
    ```
    
2. To use this hook
    
    ```jsx
    // index.tsx
    
    import { Text, View } from "react-native";
    import { useDrizzle } from "../hooks/drizzlleConnection"; // imported the hook
    
    export default function Index() {
      const db = useDrizzle(); // used the hook to get connection
    
      return (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text>text</Text>
        </View>
      );
    }
    
    ```
    

### Querying the database

We can use LiveQuery to query the db

Example snippet:

```jsx
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Text, View } from "react-native";
import { users } from "../db/schema"; // import users table schema to query users table
import { useDrizzle } from "../hooks/drizzlleConnection";

export default function Index() {
  const db = useDrizzle();
  const { data } = useLiveQuery(db.select().from(users)); // the query

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>{JSON.stringify(data)}</Text>
    </View>
  );
}

```

### Bonus: Drizzle Studio

---

References:

- https://expo.dev/blog/modern-sqlite-for-react-native-apps
- https://docs.expo.dev/guides/customizing-metro/
- https://orm.drizzle.team/docs/connect-expo-sqlite
- https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0311#live-queries-
- https://youtu.be/AT5asDD3u_A?si=c3OXtJeOTHsK1fSc
- https://orm.drizzle.team/docs/get-started/expo-new
- https://docs.expo.dev/versions/latest/sdk/sqlite/