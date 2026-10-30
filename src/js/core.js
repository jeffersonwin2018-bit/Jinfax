// Núcleo de JinfaX: se carga en todas las páginas.
import './loop.js';
import { openFromHash, syncUI } from './player.js';
import './island.js';
import './chat.js';
import { scan } from './fx.js';
import { initPage, warmup } from './router.js';
import { $ } from './util.js';

history.scrollRestoration = 'manual';
const main = $('#app');
scan($('.footer'));
initPage(main).then(() => { syncUI(); openFromHash(); warmup(); });
// La cortina de arranque se elimina sola por CSS; aquí solo limpiamos la clase al terminar
setTimeout(() => $('#curtain').classList.remove('is-boot'), 1700);
export { scan };
