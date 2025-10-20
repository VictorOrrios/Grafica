import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import string from 'vite-plugin-string';


export default defineConfig({
	plugins: [tailwindcss(), sveltekit(),
		string({
      include: ['**/*.glsl', '**/*.vert', '**/*.frag'], // extensiones que quieras importar como texto
    }),
	]
});
