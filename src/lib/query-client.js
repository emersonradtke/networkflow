import { QueryClient } from '@tanstack/react-query'
// staleTime global: dados considerados frescos por 60s — evita refetch desnecessário em cada render;


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 60_000,       // dados frescos por 60s — evita refetch em cada re-render
			gcTime: 5 * 60_000,      // mantém cache por 5min após componente desmontar
		},
	},
});