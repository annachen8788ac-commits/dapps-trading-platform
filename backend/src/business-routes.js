import { initializeTradeSchema, registerTradeRoutes } from './trade-routes.js';
import { initializeUserAdminSchema, registerUserAdminRoutes } from './user-admin-routes.js';
import { initializeSupportChatSchema, registerSupportChatRoutes } from './support-chat-routes.js';
import { initializePledgeSchema, registerPledgeRoutes } from './pledge-routes.js';
import { initializeConversionSchema, registerConversionRoutes } from './conversion-routes.js';

export async function initializeBusinessSchemas(pool){
  await initializeTradeSchema(pool);
  await initializeUserAdminSchema(pool);
  await initializeSupportChatSchema(pool);
  await initializePledgeSchema(pool);
  await initializeConversionSchema(pool);
}

export function registerBusinessRoutes(app,args){
  registerTradeRoutes(app,args);
  registerUserAdminRoutes(app,args);
  registerSupportChatRoutes(app,args);
  registerPledgeRoutes(app,args);
  registerConversionRoutes(app,args);
}
