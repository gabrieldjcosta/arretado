import { sha256 } from '../../core/util/sha256';
import { jsonCanonico } from '../../core/util/json-canonico';
import type { ItemDoAcervo } from './esquemas';

/** Hash reprodutível do item: mesma entrada, mesmo hash (JSON canônico). */
export function hashDoItem(item: ItemDoAcervo): Promise<string> {
  return sha256(new TextEncoder().encode(jsonCanonico(item)));
}
