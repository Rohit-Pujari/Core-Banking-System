import './globals.css';
export const metadata = {
  title: 'Vault · Core Banking',
  description: 'Core banking operations and DBMS demonstration workspace'
};
export default function Layout({
  children
}) {
  // Browser extensions such as Dark Reader add attributes to the root element before hydration.
  return <html lang="en" suppressHydrationWarning><body>{children}</body></html>;
}
