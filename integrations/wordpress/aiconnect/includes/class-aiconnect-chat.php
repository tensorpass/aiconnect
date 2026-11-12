<?php
/**
 * The chat, written as an <aiconnect-chat> element by the [aiconnect_chat] shortcode and the AI Connect Chat
 * block. Both take the same settings and point the chat at the site's own MCP server, so the visitor's model
 * answers from the site's posts and pages.
 *
 * @package AIConnect
 */

defined( 'ABSPATH' ) || exit;

final class AIConnect_Chat {

	const SHORTCODE = 'aiconnect_chat';
	const VARIANTS  = array( 'inline', 'panel', 'popup', 'page' );
	const LOCALES   = array( 'en', 'fr', 'he', 'ar', 'zh' );

	public static function register(): void {
		add_shortcode( self::SHORTCODE, array( self::class, 'shortcode' ) );
		register_block_type(
			dirname( AICONNECT_FILE ) . '/blocks/chat',
			array( 'render_callback' => array( self::class, 'block' ) )
		);
	}

	/**
	 * [aiconnect_chat variant="popup" heading="Ask us" launcher_label="Ask" system="…"]
	 *
	 * @param array|string $attributes The shortcode's attributes, or an empty string without any.
	 */
	public static function shortcode( $attributes ): string {
		$settings = shortcode_atts(
			array(
				'variant'        => 'popup',
				'heading'        => '',
				'launcher_label' => '',
				'placeholder'    => '',
				'system'         => '',
			),
			is_array( $attributes ) ? $attributes : array(),
			self::SHORTCODE
		);
		return self::render( $settings );
	}

	/**
	 * The block's attributes use the editor's camel case names.
	 *
	 * @param array $attributes The block's saved attributes.
	 */
	public static function block( array $attributes ): string {
		return self::render(
			array(
				'variant'        => $attributes['variant'] ?? 'popup',
				'heading'        => $attributes['heading'] ?? '',
				'launcher_label' => $attributes['launcherLabel'] ?? '',
				'placeholder'    => $attributes['placeholder'] ?? '',
				'system'         => $attributes['system'] ?? '',
			)
		);
	}

	/**
	 * Writes the element with its attributes. Empty settings are left out, so the element keeps its defaults.
	 *
	 * @param array $settings The chat's settings, as the shortcode names them.
	 */
	private static function render( array $settings ): string {
		AIConnect_Script::enqueue();
		$element = array(
			'variant'        => in_array( $settings['variant'], self::VARIANTS, true ) ? $settings['variant'] : 'popup',
			'mcp'            => rest_url( AIConnect_Mcp::NAMESPACE . AIConnect_Mcp::ROUTE ),
			'system'         => '' !== $settings['system'] ? $settings['system'] : self::default_instructions(),
			'heading'        => $settings['heading'],
			'launcher-label' => $settings['launcher_label'],
			'placeholder'    => $settings['placeholder'],
			'locale'         => self::locale(),
		);
		$html    = '<aiconnect-chat';
		foreach ( array_filter( $element, 'strlen' ) as $name => $value ) {
			$html .= sprintf( ' %s="%s"', $name, esc_attr( $value ) );
		}
		return $html . '></aiconnect-chat>';
	}

	private static function default_instructions(): string {
		return sprintf(
			/* translators: %s: the site's name. */
			__( 'You answer visitors\' questions about %s from its posts and pages. Search the site before you answer, and link the pages you use.', 'aiconnect' ),
			wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES )
		);
	}

	/**
	 * The chat speaks the site's language when it has it, and English otherwise.
	 */
	private static function locale(): string {
		$language = substr( determine_locale(), 0, 2 );
		return in_array( $language, self::LOCALES, true ) ? $language : 'en';
	}
}
