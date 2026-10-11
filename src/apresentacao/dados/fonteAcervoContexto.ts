import { createContext, useContext } from 'react';
import type { FonteDoAcervo } from '../../dominios/acervo/fonte';
import { FonteEstatica } from '../../dominios/acervo/fonte-estatica';

export const fonteAcervoPadrao: FonteDoAcervo = new FonteEstatica();
export const ContextoFonteAcervo = createContext<FonteDoAcervo>(fonteAcervoPadrao);

export const useFonteAcervo = (): FonteDoAcervo => useContext(ContextoFonteAcervo);
