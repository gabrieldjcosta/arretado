import { createContext, useContext } from 'react';
import { FonteDeIncidencia } from '../../dominios/legislacao/incidencia-fonte';

/** Os arquivos do Mapa da norma, servidos pelo app como o acervo (`/incidencia`). */
export const fonteIncidenciaPadrao = new FonteDeIncidencia();
export const ContextoFonteIncidencia = createContext<FonteDeIncidencia>(fonteIncidenciaPadrao);

export const useFonteIncidencia = (): FonteDeIncidencia => useContext(ContextoFonteIncidencia);
