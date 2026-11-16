import {createProxy} from '../../server/vercel-proxy.mjs';

export const config = {maxDuration: 30};
export default createProxy();
