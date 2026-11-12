<?php
/**
 * Plugin Name:       AI Connect
 * Plugin URI:        https://tensorpass.app/docs/quickstart/wordpress
 * Description:       An AI chat for your site that answers on each visitor's own AI account through AI Wallet, with your posts and pages served to it as MCP tools.
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            TensorPass
 * Author URI:        https://tensorpass.app
 * License:           Apache-2.0
 * License URI:       https://www.apache.org/licenses/LICENSE-2.0
 * Text Domain:       aiconnect
 *
 * @package AIConnect
 */

defined( 'ABSPATH' ) || exit;

define( 'AICONNECT_VERSION', '0.1.0' );
define( 'AICONNECT_FILE', __FILE__ );

require_once __DIR__ . '/includes/class-aiconnect-script.php';
require_once __DIR__ . '/includes/class-aiconnect-chat.php';
require_once __DIR__ . '/includes/class-aiconnect-mcp.php';

add_action( 'init', array( 'AIConnect_Script', 'register' ) );
add_action( 'init', array( 'AIConnect_Chat', 'register' ) );
add_action( 'rest_api_init', array( 'AIConnect_Mcp', 'register_routes' ) );
