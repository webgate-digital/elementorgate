<?php

/**
 * Plugin Name: ElementorGate
 * Plugin URI: https://webgate.digital/
 * Description: A collection of power tools for Elementor Editor
 * Version: 0.0.3
 * Author: Webgate
 * Author URI: https://webgate.digital
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: elementorgate
 * Domain Path: /languages
 * Requires at least: 6.0
 * Tested up to: 6.5
 * Requires PHP: 7.4
 * Network: false
 */

if (!defined('ABSPATH')) {
    exit;
}

define('EGATE_VERSION', '0.0.3');
define('EGATE_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('EGATE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('EGATE_PLUGIN_FILE', __FILE__);

// Initialize Plugin Update Checker for GitHub releases
require_once EGATE_PLUGIN_DIR . 'plugin-update-checker-5.6/load-v5p6.php';

use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

$elementorgate_update_checker = PucFactory::buildUpdateChecker(
    'https://github.com/webgate-digital/elementorgate/',
    __FILE__,
    'elementorgate'
);

// Set the branch that contains the stable release
$elementorgate_update_checker->setBranch('main');

// Enable release assets - this makes it download the zip from GitHub releases
$elementorgate_update_checker->getVcsApi()->enableReleaseAssets();

// Load Settings class (always available for admin)
require_once EGATE_PLUGIN_DIR . 'includes/class-settings.php';

/**
 * Main Plugin Class
 */
final class Elementorgate
{
    private static $instance = null;

    /**
     * Loaded modules
     */
    private $modules = [];

    /**
     * Settings instance
     */
    private $settings = null;

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        // Initialize settings
        $this->settings = EGATE_Settings::get_instance();

        add_action('plugins_loaded', [$this, 'init']);
    }

    public function init()
    {
        if (!did_action('elementor/loaded')) {
            add_action('admin_notices', [$this, 'elementor_missing_notice']);
            return;
        }

        $this->load_modules();
        add_action('elementor/editor/after_enqueue_scripts', [$this, 'enqueue_editor_assets']);
    }

    /**
     * Load all modules based on settings
     */
    private function load_modules()
    {
        // Template Previews Module
        if ($this->settings->is_feature_enabled('template_previews')) {
            require_once EGATE_PLUGIN_DIR . 'modules/template-previews/template-previews.php';
            $this->modules['template-previews'] = EGATE_Template_Previews::get_instance();
        }
    }

    /**
     * Get settings instance
     */
    public function get_settings()
    {
        return $this->settings;
    }

    /**
     * Get a loaded module
     */
    public function get_module($module_name)
    {
        return isset($this->modules[$module_name]) ? $this->modules[$module_name] : null;
    }

    public function enqueue_editor_assets()
    {
        // Font Size Previews
        if ($this->settings->is_feature_enabled('font_size_previews')) {
            wp_enqueue_script(
                'egate-typography-preview',
                EGATE_PLUGIN_URL . 'assets/js/typography-preview.js',
                ['jquery', 'egate-floating-panel'],
                EGATE_VERSION,
                true
            );
        }

        // Editor Toolbar (Command Palette)
        if ($this->settings->is_feature_enabled('editor_toolbar')) {
            wp_enqueue_script(
                'egate-command-palette',
                EGATE_PLUGIN_URL . 'assets/js/command-palette.js',
                [],
                EGATE_VERSION,
                true
            );
        }


        // Always load these utilities (they support other features)
        wp_enqueue_script(
            'egate-floating-panel',
            EGATE_PLUGIN_URL . 'assets/js/floating-panel.js',
            [],
            EGATE_VERSION,
            true
        );

        wp_enqueue_script(
            'egate-element-tools',
            EGATE_PLUGIN_URL . 'assets/js/element-tools.js',
            [],
            EGATE_VERSION,
            true
        );

        wp_enqueue_script(
            'egate-spacing-measure',
            EGATE_PLUGIN_URL . 'assets/js/spacing-measure.js',
            [],
            EGATE_VERSION,
            true
        );

        wp_enqueue_script(
            'egate-keyboard-navigation',
            EGATE_PLUGIN_URL . 'assets/js/keyboard-navigation.js',
            ['egate-element-tools'],
            EGATE_VERSION,
            true
        );

        wp_enqueue_script(
            'egate-css-id-visualizer',
            EGATE_PLUGIN_URL . 'assets/js/css-id-visualizer.js',
            ['egate-floating-panel'],
            EGATE_VERSION,
            true
        );

        wp_enqueue_script(
            'egate-global-styles-visualizer',
            EGATE_PLUGIN_URL . 'assets/js/global-styles-visualizer.js',
            ['egate-floating-panel'],
            EGATE_VERSION,
            true
        );

        wp_enqueue_script(
            'egate-custom-css-visualizer',
            EGATE_PLUGIN_URL . 'assets/js/custom-css-visualizer.js',
            ['egate-floating-panel'],
            EGATE_VERSION,
            true
        );

        wp_enqueue_style(
            'egate-styles',
            EGATE_PLUGIN_URL . 'assets/css/power-tools.css',
            [],
            EGATE_VERSION
        );
    }

    public function elementor_missing_notice()
    {
?>
        <div class="notice notice-warning is-dismissible">
            <p><?php esc_html_e('ElementorGate requires Elementor to be installed and activated.', 'elementorgate'); ?></p>
        </div>
<?php
    }
}

function elementorgate_init()
{
    return Elementorgate::get_instance();
}

elementorgate_init();

/**
 * Plugin activation hook
 */
register_activation_hook(EGATE_PLUGIN_FILE, function () {
    // Load and activate Template Previews module
    require_once EGATE_PLUGIN_DIR . 'modules/template-previews/template-previews.php';
    EGATE_Template_Previews::activate();
});

/**
 * Plugin deactivation hook
 */
register_deactivation_hook(EGATE_PLUGIN_FILE, function () {
    // Deactivate Template Previews module
    require_once EGATE_PLUGIN_DIR . 'modules/template-previews/template-previews.php';
    EGATE_Template_Previews::deactivate();
});
