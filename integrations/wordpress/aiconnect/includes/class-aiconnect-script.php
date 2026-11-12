<?php
/**
 * The AI Connect Web Components script: one file that defines <aiconnect-chat> and <aiconnect-search>.
 * It is registered on every request and enqueued only by a page that renders a chat. It loads deferred, so the
 * page paints before it runs.
 *
 * @package AIConnect
 */

defined( 'ABSPATH' ) || exit;

final class AIConnect_Script {

	const HANDLE = 'aiconnect-elements';

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
}
