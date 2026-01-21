<?php

/**
 * Plugin Name: Elementor Power Tools
 * Description: A collection of power tools for Elementor - typography preview, spacing measurement, command palette, keyboard navigation, and more
 * Version: 0.0.1
 * Author: Webgate
 * Author URI: https://webgate.digital
 * Text Domain: elementor-power-tools
 * Requires at least: 6.0
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) {
    exit;
}

define('EPT_VERSION', '0.0.1');
define('EPT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('EPT_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main Plugin Class
 */
final class Elementor_Power_Tools
{
    private static $instance = null;

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        add_action('plugins_loaded', [$this, 'init']);
    }

    public function init()
    {
        if (!did_action('elementor/loaded')) {
            add_action('admin_notices', [$this, 'elementor_missing_notice']);
            return;
        }

        add_action('elementor/editor/before_enqueue_scripts', [$this, 'enqueue_editor_assets']);
    }

    public function enqueue_editor_assets()
    {
        wp_enqueue_script(
            'ept-typography-preview',
            EPT_PLUGIN_URL . 'assets/js/typography-preview.js',
            ['jquery'],
            EPT_VERSION,
            true
        );

        wp_enqueue_script(
            'ept-element-tools',
            EPT_PLUGIN_URL . 'assets/js/element-tools.js',
            [],
            EPT_VERSION,
            true
        );

        wp_enqueue_script(
            'ept-command-palette',
            EPT_PLUGIN_URL . 'assets/js/command-palette.js',
            [],
            EPT_VERSION,
            true
        );

        wp_enqueue_script(
            'ept-spacing-measure',
            EPT_PLUGIN_URL . 'assets/js/spacing-measure.js',
            [],
            EPT_VERSION,
            true
        );

        wp_enqueue_script(
            'ept-keyboard-navigation',
            EPT_PLUGIN_URL . 'assets/js/keyboard-navigation.js',
            ['ept-element-tools'],
            EPT_VERSION,
            true
        );

        wp_enqueue_style(
            'ept-power-tools',
            EPT_PLUGIN_URL . 'assets/css/power-tools.css',
            [],
            EPT_VERSION
        );
    }

    public function elementor_missing_notice()
    {
?>
        <div class="notice notice-warning is-dismissible">
            <p><?php esc_html_e('Elementor Power Tools requires Elementor to be installed and activated.', 'elementor-power-tools'); ?></p>
        </div>
<?php
    }
}

function elementor_power_tools_init()
{
    return Elementor_Power_Tools::get_instance();
}

elementor_power_tools_init();
