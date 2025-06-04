import type { Config } from 'drizzle-kit';

export default {
	schema: './src/db/schema.ts',
	// schema file is linked in the drizzle.config.ts so 
	// that drizzle-kit can use it to migrate schema.
	
	out: './drizzle',
    dialect: 'sqlite',
	driver: 'expo', // <--- very important
} satisfies Config;