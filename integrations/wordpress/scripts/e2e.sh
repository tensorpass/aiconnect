#!/usr/bin/env bash
# The plugin end to end: WordPress at http://localhost:5046 with the plugin, a post to find, and a page per
# form of the chat, then the Playwright tests with the built AI Wallet and pretty permalinks, then the sign in
# tests again with plain permalinks. Each run keeps its screenshots in test-results/<permalinks>. The stack and
# its volumes are removed on exit. Needs the SDK built (npm run build) and the wallet built in ../aiwallet, or
# AIWALLET_DIST.
set -euo pipefail

here="$(cd "$(dirname "$0")/.." && pwd)"
cd "$here"
"$here/scripts/package.sh" > /dev/null

trap 'docker compose --profile cli down -v' EXIT
docker compose up -d --wait

wp() {
  docker compose run --rm -T cli wp "$@"
}

# A password made for this run, which the editor test signs in with.
export WP_ADMIN_PASSWORD="$(openssl rand -hex 12)"
wp core install --url=http://localhost:5046 --title='Sourdough Club' --admin_user=admin \
  --admin_password="$WP_ADMIN_PASSWORD" --admin_email=admin@example.com --skip-email
wp rewrite structure '/%postname%/'
wp plugin activate aiconnect
wp post create --post_type=post --post_status=publish --post_title='Feeding a sourdough starter' \
  --post_content='<!-- wp:paragraph --><p>Feed the starter twice a day with equal weights of flour and water.</p><!-- /wp:paragraph -->'
wp post create --post_type=post --post_status=draft --post_title='Draft about rye bread' \
  --post_content='This draft stays out of the tools.'
wp post create --post_type=page --post_status=publish --post_name=ask --post_title='Ask the club' \
  --post_content='[aiconnect_chat variant="inline" heading="Ask the club"]'
wp post create --post_type=page --post_status=publish --post_name=ask-block --post_title='Ask with the block' \
  --post_content='<!-- wp:aiconnect/chat {"variant":"popup","launcherLabel":"Ask the club"} /-->'

WP_PERMALINKS=pretty npx playwright test -c "$here/playwright.config.ts" --output "$here/test-results/pretty" "$@"

wp rewrite structure ''
WP_PERMALINKS=plain npx playwright test -c "$here/playwright.config.ts" --output "$here/test-results/plain" \
  signIn "$@"
