// The site's own values for its chat guards. The page passes this object to the AI Connect modules as
// `guards`, the MCP server checks its tool results with it, and the pen test reads it, so a change here
// reaches every check at once. Replace each value with the site's.

export const chatPolicy = {
  // What the visitor's AI is told about the site, its tools and its tone. Public facts only: the page
  // sends this text from the visitor's browser, where anyone can read it.
  instructions: [
    'You answer visitors of Example Shop, an online shop for hiking gear.',
    'Call search_site first, then answer from what it returns, with a link to each page you cite.',
    'If nothing matches, say so and suggest the contact page.',
  ].join('\n'),
  // What the chat answers about; anything else gets a short redirection.
  scope: 'Example Shop, its products, orders, delivery and returns',
  // Hosts the answers may link to, besides the page's own origin and the addresses the tools return as
  // fields.
  allowedLinkHosts: ['example.com'],
  // Addresses the answers may give, besides the ones the visitor typed and the tools return.
  allowedEmails: ['help@example.com'],
  // Internal names kept out of the answers and the tool results: tool and table names, vendors, servers,
  // identifier shapes. Plain words or regular expression sources.
  denyPatterns: ['search_site', 'read_page', '\\bpostgres\\b', '\\bstripe_[a-z]+', '\\b[a-f0-9]{24}\\b'],
  // Content the site does not hand out, such as a template with placeholders to fill in.
  withholdPatterns: [],
  // Tools whose activity the chat shows; the others run without a line in the conversation.
  visibleTools: ['search_site'],
  maxInputLength: 2000,
  // Shown in place of a question or an answer a guard stops. Leave it out for the modules' own words in the
  // page's language.
  safeAnswer: 'I can help with questions about Example Shop, its products and your orders.',
  // Questions a real visitor asks, which every guard must let through.
  sampleQuestions: ['Which tent do you sell for two people?', 'How long does delivery take to Lyon?'],
};
