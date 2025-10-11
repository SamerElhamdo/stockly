export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  PrintInvoice: { id: number };
  PrintReturn: { id: number };
};

export type HomeStackParamList = {
  Dashboard: undefined;
};

export type SalesStackParamList = {
  Invoices: undefined;
  Returns: undefined;
  Payments: undefined;
  PaymentCreate: { customerId: number; customerName: string; mode: 'add' | 'withdraw' };
  InvoiceCreate: { customerId: number; customerName: string };
};

export type InventoryStackParamList = {
  Products: undefined;
  Categories: undefined;
  Archive: undefined;
};

export type MoreStackParamList = {
  Customers: { openAdd?: boolean } | undefined;
  CustomerDetails: { customerId: number };
  PaymentCreate: { customerId: number; customerName: string; mode: 'add' | 'withdraw' };
  Users: undefined;
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Sales: undefined;
  Inventory: undefined;
  More: undefined;
};
