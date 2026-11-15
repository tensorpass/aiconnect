<?php
/**
 * The plugin's one setting, the site's TensorPass site key, on the AI Connect page under Settings. With a key,
 * a visitor without AI Wallet can sign in to the TensorPass plan in the chat; without one, the chat offers
 * OpenRouter alone. The key is public: it names the site and is written into the pages that show a chat. The
 * command `npx @tensorpass/aiconnect site-key <domain>` issues one.
 *
 * @package AIConnect
 */

defined( 'ABSPATH' ) || exit;

final class AIConnect_Settings {

	const OPTION = 'aiconnect_site_key';
	const PAGE   = 'aiconnect';
	const GROUP  = 'aiconnect';
	const FORMAT = '/^tpk_[A-Za-z0-9_-]{24}$/';

	public static function register(): void {
		register_setting(
			self::GROUP,
			self::OPTION,
			array(
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => array( self::class, 'sanitize' ),
			)
		);
		add_settings_section( 'aiconnect_web_accounts', __( 'Visitors without AI Wallet', 'aiconnect' ), '__return_null', self::PAGE );
		add_settings_field(
			self::OPTION,
			__( 'TensorPass site key', 'aiconnect' ),
			array( self::class, 'field' ),
			self::PAGE,
			'aiconnect_web_accounts',
			array( 'label_for' => self::OPTION )
		);
	}

	public static function add_page(): void {
		add_options_page( __( 'AI Connect', 'aiconnect' ), __( 'AI Connect', 'aiconnect' ), 'manage_options', self::PAGE, array( self::class, 'page' ) );
	}

	/**
	 * The key as saved: a key of the right form, or nothing. Another value keeps the key saved before it.
	 *
	 * @param mixed $value The value the settings form sent.
	 */
	public static function sanitize( $value ): string {
		$key = trim( (string) $value );
		if ( '' === $key || 1 === preg_match( self::FORMAT, $key ) ) {
			return $key;
		}
		add_settings_error( self::OPTION, 'aiconnect_site_key_invalid', __( 'A TensorPass site key starts with tpk_ and has 28 characters.', 'aiconnect' ) );
		return self::site_key();
	}

	public static function site_key(): string {
		return (string) get_option( self::OPTION, '' );
	}

	public static function field(): void {
		printf(
			'<input type="text" id="%1$s" name="%1$s" value="%2$s" class="regular-text code" spellcheck="false" autocomplete="off" placeholder="tpk_">',
			esc_attr( self::OPTION ),
			esc_attr( self::site_key() )
		);
		echo '<p class="description">' . esc_html__( 'Lets a visitor without AI Wallet answer with a TensorPass plan. Without a key, the chat offers OpenRouter to those visitors.', 'aiconnect' ) . '</p>';
	}

	public static function page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		echo '<div class="wrap"><h1>' . esc_html( get_admin_page_title() ) . '</h1><form action="options.php" method="post">';
		settings_fields( self::GROUP );
		do_settings_sections( self::PAGE );
		submit_button();
		echo '</form></div>';
	}
}
