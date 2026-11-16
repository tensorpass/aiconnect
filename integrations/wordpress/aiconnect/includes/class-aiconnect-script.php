<?php
/**
 * The AI Connect Web Components script: one file that defines <aiconnect-chat> and <aiconnect-search>.
 * It is registered on every request and enqueued only by a page that renders a chat. It loads deferred, so the
 * page paints before it runs.
 *
 * The plugin also ships the return page of the chat's web sign ins, sign-in.html, a static page that loads
 * aiconnect-callback.js. The web server serves it without WordPress, so it loads no theme and no other plugin.
 * Its address has no query string in any permalink setting, which leaves the provider free to append its code.
 *
 * @package AIConnect
 */

defined( 'ABSPATH' ) || exit;

final class AIConnect_Script {

	const HANDLE       = 'aiconnect-elements';
	const SIGN_IN_PAGE = 'sign-in.html';

	public static function register(): void {
		wp_register_script(
			self::HANDLE,
			plugins_url( 'assets/aiconnect-elements.js', AICONNECT_FILE ),
			array(),
			AICONNECT_VERSION,
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}

	public static function enqueue(): void {
		wp_enqueue_script( self::HANDLE );
	}

	/**
	 * The address the OpenRouter and TensorPass sign in windows come back to, on the site's own origin.
	 */
	public static function sign_in_page(): string {
		return plugins_url( self::SIGN_IN_PAGE, AICONNECT_FILE );
	}
}
