<?php
/**
 * Plugin Name:       AI Connect
 * Plugin URI:        https://tensorpass.app/docs/quickstart/wordpress
 * Description:       An AI chat for your site that answers on each visitor's own AI account through AI Wallet, or an account they sign in to in the chat, with your posts and pages served to it as MCP tools.
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
require_once __DIR__ . '/includes/class-aiconnect-settings.php';

add_action( 'init', array( 'AIConnect_Script', 'register' ) );
add_action( 'init', array( 'AIConnect_Chat', 'register' ) );
add_action( 'rest_api_init', array( 'AIConnect_Mcp', 'register_routes' ) );
add_action( 'admin_init', array( 'AIConnect_Settings', 'register' ) );
add_action( 'admin_menu', array( 'AIConnect_Settings', 'add_page' ) );
