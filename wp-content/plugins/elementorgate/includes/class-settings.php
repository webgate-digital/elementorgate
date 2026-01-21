<?php

/**
 * Elementorgate Settings Page
 */

if (!defined('ABSPATH')) {
    exit;
}

class EGATE_Settings
{
    private static $instance = null;

    /**
     * Option name for storing settings
     */
    const OPTION_NAME = 'elementorgate_settings';

    /**
     * Default settings
     */
    private $defaults = [
        'font_size_previews' => true,
        'template_previews' => true,
        'editor_toolbar' => true,
    ];

    /**
     * Feature definitions for the settings page
     */
    private $features = [];

    public static function get_instance()
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct()
    {
        $this->define_features();
        $this->init_hooks();
    }

    /**
     * Define available features
     */
    private function define_features()
    {
        $this->features = [
            'font_size_previews' => [
                'title' => __('Font Size Previews', 'elementorgate'),
                'description' => __('Show font size preview in typography controls', 'elementorgate'),
                'icon' => 'dashicons-editor-textcolor',
            ],
            'template_previews' => [
                'title' => __('Template Previews', 'elementorgate'),
                'description' => __('Display thumbnail previews in the template library', 'elementorgate'),
                'icon' => 'dashicons-images-alt2',
            ],
            'editor_toolbar' => [
                'title' => __('Editor Toolbar (Cmd+K)', 'elementorgate'),
                'description' => __('Quick command palette accessible via Cmd+K / Ctrl+K', 'elementorgate'),
                'icon' => 'dashicons-search',
            ],
        ];
    }

    /**
     * Initialize hooks
     */
    private function init_hooks()
    {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_filter('plugin_action_links_' . plugin_basename(EGATE_PLUGIN_FILE), [$this, 'add_settings_link']);
    }

    /**
     * Add settings link to plugins page
     */
    public function add_settings_link($links)
    {
        $settings_link = '<a href="' . admin_url('admin.php?page=elementorgate') . '">' . __('Settings', 'elementorgate') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * Add admin menu page
     */
    public function add_admin_menu()
    {
        $icon_svg = '<svg width="20" height="20" viewBox="0 0 525 525" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M472.5 0C501.495 1.6493e-05 525 23.5051 525 52.5V472.5C525 501.495 501.495 525 472.5 525H52.5C23.5051 525 1.64952e-05 501.495 0 472.5V52.5C0 23.505 23.505 0 52.5 0H472.5ZM174.808 119.75C131.267 119.75 95.9845 154.973 95.9844 198.441V405.152L253.631 267.713V405.152L494.882 194.826H337.234L253.631 267.713V198.441C253.631 154.973 218.348 119.75 174.808 119.75Z" fill="#a0a5aa"/></svg>';
        $icon_base64 = 'data:image/svg+xml;base64,' . base64_encode($icon_svg);

        add_menu_page(
            __('ElementorGate', 'elementorgate'),
            __('ElementorGate', 'elementorgate'),
            'manage_options',
            'elementorgate',
            [$this, 'render_settings_page'],
            $icon_base64,
            59
        );
    }

    /**
     * Register settings
     */
    public function register_settings()
    {
        register_setting(
            'elementorgate_settings_group',
            self::OPTION_NAME,
            [
                'type' => 'array',
                'sanitize_callback' => [$this, 'sanitize_settings'],
                'default' => $this->defaults,
            ]
        );
    }

    /**
     * Sanitize settings
     */
    public function sanitize_settings($input)
    {
        $sanitized = [];

        foreach (array_keys($this->defaults) as $key) {
            $sanitized[$key] = isset($input[$key]) ? (bool) $input[$key] : false;
        }

        return $sanitized;
    }

    /**
     * Get all settings
     */
    public function get_settings()
    {
        $settings = get_option(self::OPTION_NAME, $this->defaults);
        return wp_parse_args($settings, $this->defaults);
    }

    /**
     * Check if a feature is enabled
     */
    public function is_feature_enabled($feature)
    {
        $settings = $this->get_settings();
        return isset($settings[$feature]) ? (bool) $settings[$feature] : false;
    }

    /**
     * Enqueue admin assets
     */
    public function enqueue_admin_assets($hook)
    {
        if ($hook !== 'toplevel_page_elementorgate') {
            return;
        }

        wp_enqueue_style(
            'egate-admin-settings',
            EGATE_PLUGIN_URL . 'assets/css/admin-settings.css',
            [],
            EGATE_VERSION
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page()
    {
        $settings = $this->get_settings();
        ?>
        <div class="wrap egate-settings-wrap">
            <h1><?php esc_html_e('ElementorGate', 'elementorgate'); ?></h1>
            <p><?php esc_html_e('Enable or disable features below.', 'elementorgate'); ?></p>

            <form method="post" action="options.php">
                <?php settings_fields('elementorgate_settings_group'); ?>

                <div class="egate-features-list">
                    <?php foreach ($this->features as $key => $feature) : ?>
                        <div class="egate-feature-item">
                            <div class="egate-feature-info">
                                <h3><?php echo esc_html($feature['title']); ?></h3>
                                <p><?php echo esc_html($feature['description']); ?></p>
                            </div>
                            <label class="egate-toggle">
                                <input type="checkbox"
                                       name="<?php echo esc_attr(self::OPTION_NAME . '[' . $key . ']'); ?>"
                                       value="1"
                                       <?php checked($settings[$key], true); ?>>
                                <span class="egate-toggle-slider"></span>
                            </label>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div class="egate-settings-footer">
                    <?php submit_button(__('Save Settings', 'elementorgate'), 'primary', 'submit', false); ?>
                </div>
            </form>
        </div>
        <?php
    }

    /**
     * Get available features (for extensibility)
     */
    public function get_features()
    {
        return $this->features;
    }

    /**
     * Register a new feature (for extensibility)
     */
    public function register_feature($key, $args)
    {
        $defaults = [
            'title' => '',
            'description' => '',
            'icon' => 'dashicons-admin-generic',
            'default' => true,
        ];

        $this->features[$key] = wp_parse_args($args, $defaults);
        $this->defaults[$key] = $args['default'] ?? true;
    }
}
