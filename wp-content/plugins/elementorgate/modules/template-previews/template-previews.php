<?php

/**
 * Template Previews Module
 * Adds thumbnail preview functionality to Elementor's template library
 */

if (!defined('ABSPATH')) {
    exit;
}

class EGATE_Template_Previews
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
        $this->init();
    }

    public function init()
    {
        // Register the endpoint and handle requests
        add_action('init', [$this, 'register_template_preview_endpoint']);
        add_action('parse_request', [$this, 'handle_template_preview_request']);

        // Add query vars
        add_filter('query_vars', [$this, 'add_query_vars']);

        // Enqueue assets in Elementor editor
        add_action('elementor/editor/footer', [$this, 'enqueue_preview_assets']);
    }

    /**
     * Register rewrite endpoint
     */
    public function register_template_preview_endpoint()
    {
        add_rewrite_rule('^template-preview/([0-9]+)/?', 'index.php?template_preview_id=$matches[1]', 'top');
        add_rewrite_tag('%template_preview_id%', '([0-9]+)');
    }

    /**
     * Add custom query vars
     */
    public function add_query_vars($vars)
    {
        $vars[] = 'template_preview_id';
        return $vars;
    }

    /**
     * Handle template preview request
     */
    public function handle_template_preview_request($wp)
    {
        if (!array_key_exists('template_preview_id', $wp->query_vars)) {
            return;
        }

        $template_id = intval($wp->query_vars['template_preview_id']);

        if (!$template_id) {
            wp_die('Invalid template ID.');
        }

        $template_post = get_post($template_id);

        if (!$template_post || $template_post->post_type !== 'elementor_library') {
            wp_die('Template not found.');
        }

        $this->render_public_template($template_post);
        exit;
    }

    /**
     * Render template publicly with all Elementor assets
     */
    private function render_public_template($template_post)
    {
        if (!class_exists('\Elementor\Plugin')) {
            wp_die('Elementor not available.');
        }

        $elementor = \Elementor\Plugin::instance();
        $elementor->frontend->init();

        $document = $elementor->documents->get($template_post->ID);

        if (!$document) {
            wp_die('Could not load template document.');
        }

        global $post;
        $post = $template_post;
        setup_postdata($post);

        ob_start();
?>
        <!DOCTYPE html>
        <html <?php language_attributes(); ?>>

        <head>
            <meta charset="<?php bloginfo('charset'); ?>">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <meta name="robots" content="noindex, nofollow">
            <title><?php echo esc_html($template_post->post_title); ?> - Template Preview</title>

            <?php
            wp_head();
            $elementor->frontend->enqueue_styles();
            $elementor->frontend->enqueue_scripts();
            wp_print_styles();
            ?>

            <style>
                body {
                    margin: 0;
                    padding: 0;
                }

                #wpadminbar {
                    display: none !important;
                }

                html {
                    margin-top: 0 !important;
                }
            </style>
        </head>

        <body <?php body_class('elementor-template-preview'); ?>>

            <?php
            echo $document->get_content();
            ?>

            <?php
            wp_footer();
            ?>

            <script>
                if (typeof elementorFrontend !== 'undefined') {
                    elementorFrontend.init();
                }
            </script>
        </body>

        </html>
<?php

        $output = ob_get_clean();
        wp_reset_postdata();

        echo $output;
    }

    /**
     * Enqueue CSS and JS assets for preview functionality
     */
    public function enqueue_preview_assets()
    {
        $module_url = EGATE_PLUGIN_URL . 'modules/template-previews/';
        $module_path = EGATE_PLUGIN_DIR . 'modules/template-previews/';

        $css_file = $module_path . 'template-previews.css';
        $js_file = $module_path . 'template-previews.js';

        wp_enqueue_style(
            'egate-template-previews',
            $module_url . 'template-previews.css',
            [],
            file_exists($css_file) ? filemtime($css_file) : EGATE_VERSION
        );

        wp_enqueue_script(
            'egate-template-previews',
            $module_url . 'template-previews.js',
            ['jquery'],
            file_exists($js_file) ? filemtime($js_file) : EGATE_VERSION,
            true
        );

        wp_localize_script('egate-template-previews', 'egateTemplatePreviews', [
            'adminUrl' => admin_url(),
            'strings' => [
                'insert' => __('Insert', 'elementorgate'),
                'edit' => __('Edit', 'elementorgate'),
                'delete' => __('Delete', 'elementorgate'),
                'export' => __('Export', 'elementorgate'),
                'more_actions' => __('More actions', 'elementorgate'),
            ]
        ]);
    }

    /**
     * Flush rewrite rules on activation
     */
    public static function activate()
    {
        $instance = self::get_instance();
        $instance->register_template_preview_endpoint();
        flush_rewrite_rules();
    }

    /**
     * Flush rewrite rules on deactivation
     */
    public static function deactivate()
    {
        flush_rewrite_rules();
    }
}
