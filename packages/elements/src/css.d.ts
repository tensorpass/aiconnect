// The build loads stylesheets as text: the elements put them in their shadow roots and in the page.
declare module '*.css' {
  const text: string;
  export default text;
}
