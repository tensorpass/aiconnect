<?php
/**
 * The site's MCP server, at /wp-json/aiconnect/v1/mcp: the posts and pages the public can read, as two
 * tools the visitor's model calls. It speaks MCP over Streamable HTTP without sessions and answers in JSON,
 * so it serves POST only.
 *
 * @package AIConnect
 */

defined( 'ABSPATH' ) || exit;

final class AIConnect_Mcp {

	const NAMESPACE = 'aiconnect/v1';
	const ROUTE     = '/mcp';

	// The protocol versions this server speaks, newest first.
	const PROTOCOL_VERSIONS = array( '2025-11-25', '2025-06-18', '2025-03-26' );

	const MAX_RESULTS = 10;
	// The longest text a post gives the model, in characters.
	const MAX_CONTENT   = 8000;
	const EXCERPT_WORDS = 40;

	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			self::ROUTE,
			array(
				array(
					'methods'             => 'POST',
					'callback'            => array( self::class, 'handle' ),
					'permission_callback' => '__return_true',
				),
				array(
					'methods'             => 'GET, DELETE',
					'callback'            => array( self::class, 'method_not_allowed' ),
					'permission_callback' => '__return_true',
				),
			)
		);
	}

	public static function method_not_allowed(): WP_REST_Response {
		return new WP_REST_Response( array( 'error' => 'Method not allowed' ), 405, array( 'Allow' => 'POST' ) );
	}

	public static function handle( WP_REST_Request $request ): WP_REST_Response {
		$message = $request->get_json_params();
		if ( ! is_array( $message ) || '2.0' !== ( $message['jsonrpc'] ?? null ) || ! is_string( $message['method'] ?? null ) ) {
			return self::error( null, -32600, 'Invalid request', 400 );
		}
		// A notification, such as notifications/initialized, expects no answer.
		if ( ! array_key_exists( 'id', $message ) ) {
			return new WP_REST_Response( null, 202 );
		}
		$params = is_array( $message['params'] ?? null ) ? $message['params'] : array();
		switch ( $message['method'] ) {
			case 'initialize':
				return self::result( $message['id'], self::initialize( $params ) );
			case 'ping':
				return self::result( $message['id'], new stdClass() );
			case 'tools/list':
				return self::result( $message['id'], array( 'tools' => self::tools() ) );
			case 'tools/call':
				return self::result( $message['id'], self::call( $params ) );
			default:
				return self::error( $message['id'], -32601, 'Method not found', 200 );
		}
	}

	private static function initialize( array $params ): array {
		$asked = $params['protocolVersion'] ?? '';
		return array(
			'protocolVersion' => in_array( $asked, self::PROTOCOL_VERSIONS, true ) ? $asked : self::PROTOCOL_VERSIONS[0],
			'capabilities'    => array( 'tools' => new stdClass() ),
			'serverInfo'      => array(
				'name'    => 'aiconnect-wordpress',
				'version' => AICONNECT_VERSION,
			),
		);
	}

	private static function tools(): array {
		return array(
			array(
				'name'        => 'search_posts',
				'description' => 'Search the posts and pages of this site. Returns each match with its id, title, address, date and excerpt. Use get_post with an id to read one in full.',
				'inputSchema' => array(
					'type'       => 'object',
					'properties' => array(
						'query' => array(
							'type'        => 'string',
							'description' => 'The words to search for, such as a topic or a product name.',
						),
						'limit' => array(
							'type'        => 'integer',
							'minimum'     => 1,
							'maximum'     => self::MAX_RESULTS,
							'description' => 'How many matches to return. Defaults to 5.',
						),
					),
					'required'   => array( 'query' ),
				),
			),
			array(
				'name'        => 'get_post',
				'description' => 'Read one post or page of this site in full, by the id search_posts returned.',
				'inputSchema' => array(
					'type'       => 'object',
					'properties' => array(
						'id' => array(
							'type'        => 'integer',
							'description' => 'The id of the post or page.',
						),
					),
					'required'   => array( 'id' ),
				),
			),
		);
	}

	private static function call( array $params ): array {
		$arguments = is_array( $params['arguments'] ?? null ) ? $params['arguments'] : array();
		switch ( $params['name'] ?? '' ) {
			case 'search_posts':
				return self::search_posts( $arguments );
			case 'get_post':
				return self::get_post( $arguments );
			default:
				return self::tool_error( 'Unknown tool.' );
		}
	}

	private static function search_posts( array $arguments ): array {
		$query = trim( (string) ( $arguments['query'] ?? '' ) );
		if ( '' === $query ) {
			return self::tool_error( 'Give the words to search for in query.' );
		}
		$limit = max( 1, min( self::MAX_RESULTS, (int) ( $arguments['limit'] ?? 5 ) ) );
		$posts = get_posts(
			array(
				's'                => $query,
				'post_type'        => self::public_types(),
				'post_status'      => 'publish',
				'has_password'     => false,
				'posts_per_page'   => $limit,
				'suppress_filters' => false,
			)
		);
		if ( ! $posts ) {
			return self::text( sprintf( 'No post or page matches "%s". Try other words.', $query ) );
		}
		return self::text( self::json( array_map( array( self::class, 'summary' ), $posts ) ) );
	}

	private static function get_post( array $arguments ): array {
		$post = get_post( (int) ( $arguments['id'] ?? 0 ) );
		if ( ! self::is_public( $post ) ) {
			return self::tool_error( 'No published post or page has this id.' );
		}
		$content = self::plain_text( $post->post_content );
		$entry   = self::summary( $post ) + array( 'content' => mb_substr( $content, 0, self::MAX_CONTENT ) );
		return self::text( self::json( $entry ) );
	}

	/**
	 * Only what any visitor can already read: published, without a password, of a public post type.
	 *
	 * @param mixed $post What get_post returned.
	 */
	private static function is_public( $post ): bool {
		return $post instanceof WP_Post
			&& 'publish' === $post->post_status
			&& '' === $post->post_password
			&& in_array( $post->post_type, self::public_types(), true );
	}

	private static function public_types(): array {
		return array_values( array_diff( get_post_types( array( 'public' => true ) ), array( 'attachment' ) ) );
	}

	private static function summary( WP_Post $post ): array {
		return array(
			'id'      => $post->ID,
			'title'   => wp_specialchars_decode( get_the_title( $post ), ENT_QUOTES ),
			'url'     => get_permalink( $post ),
			'date'    => get_post_time( 'Y-m-d', true, $post ),
			'excerpt' => wp_trim_words( self::plain_text( self::excerpt_source( $post ) ), self::EXCERPT_WORDS ),
		);
	}

	/**
	 * The excerpt the author wrote, or the post's content without one.
	 *
	 * @param WP_Post $post The post.
	 */
	private static function excerpt_source( WP_Post $post ): string {
		return '' !== $post->post_excerpt ? $post->post_excerpt : $post->post_content;
	}

	/**
	 * The text of a post without its markup, block comments or shortcodes.
	 *
	 * @param string $html The post's content or excerpt.
	 */
	private static function plain_text( string $html ): string {
		$text = wp_strip_all_tags( strip_shortcodes( $html ) );
		return trim( preg_replace( '/\s+/u', ' ', html_entity_decode( $text, ENT_QUOTES, 'UTF-8' ) ) );
	}

	private static function json( array $value ): string {
		return wp_json_encode( $value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );
	}

	private static function text( string $text ): array {
		return array(
			'content' => array(
				array(
					'type' => 'text',
					'text' => $text,
				),
			),
		);
	}

	private static function tool_error( string $message ): array {
		return self::text( $message ) + array( 'isError' => true );
	}

	private static function result( $id, $result ): WP_REST_Response {
		return new WP_REST_Response(
			array(
				'jsonrpc' => '2.0',
				'id'      => $id,
				'result'  => $result,
			)
		);
	}

	/**
	 * A message that is not JSON-RPC answers 400; a request the server cannot serve gets its error in a 200.
	 *
	 * @param mixed  $id      The request's id, or null when it has none.
	 * @param int    $code    The JSON-RPC error code.
	 * @param string $message The error's message.
	 * @param int    $status  The HTTP status.
	 */
	private static function error( $id, int $code, string $message, int $status ): WP_REST_Response {
		$error = array(
			'jsonrpc' => '2.0',
			'id'      => $id,
			'error'   => array(
				'code'    => $code,
				'message' => $message,
			),
		);
		return new WP_REST_Response( $error, $status );
	}
}
