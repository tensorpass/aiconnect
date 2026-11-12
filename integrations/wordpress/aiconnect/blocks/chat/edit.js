// The AI Connect Chat block in the editor: a placeholder that names the chat's form, and the chat's settings in
// the sidebar. The server writes the chat itself (see includes/class-aiconnect-chat.php). A plain script on the
// editor's globals, so the plugin ships without a build step.

(function registerChatBlock({ blocks, element, blockEditor, components, i18n }) {
  const el = element.createElement;
  const { __ } = i18n;
  const { InspectorControls, useBlockProps } = blockEditor;
  const { PanelBody, Placeholder, RadioControl, TextControl, TextareaControl } = components;

  const VARIANTS = [
    { label: __('Popup, opened from a button', 'aiconnect'), value: 'popup' },
    { label: __('Panel at the page edge', 'aiconnect'), value: 'panel' },
    { label: __('Inline, where the block sits', 'aiconnect'), value: 'inline' },
    { label: __('Full page', 'aiconnect'), value: 'page' },
  ];

  const TEXT_FIELDS = [
    { name: 'heading', label: __('Heading', 'aiconnect') },
    { name: 'launcherLabel', label: __('Button label', 'aiconnect') },
    { name: 'placeholder', label: __('Question box placeholder', 'aiconnect') },
  ];

  function Settings({ attributes, setAttributes }) {
    const update = (name) => (value) => setAttributes({ [name]: value });
    return el(InspectorControls, null, el(
      PanelBody,
      { title: __('Chat', 'aiconnect') },
      el(RadioControl, {
        label: __('Form', 'aiconnect'),
        selected: attributes.variant,
        options: VARIANTS,
        onChange: update('variant'),
      }),
      ...TEXT_FIELDS.map(({ name, label }) => el(TextControl, {
        key: name,
        label,
        value: attributes[name],
        onChange: update(name),
        __nextHasNoMarginBottom: true,
      })),
      el(TextareaControl, {
        label: __('Instructions for the visitor\'s AI', 'aiconnect'),
        help: __('Leave empty to answer from this site\'s posts and pages.', 'aiconnect'),
        value: attributes.system,
        onChange: update('system'),
        __nextHasNoMarginBottom: true,
      }),
    ));
  }

  blocks.registerBlockType('aiconnect/chat', {
    edit(props) {
      const variant = VARIANTS.find((item) => item.value === props.attributes.variant) ?? VARIANTS[0];
      return el(
        'div',
        useBlockProps(),
        el(Settings, props),
        el(Placeholder, {
          icon: 'format-chat',
          label: __('AI Connect Chat', 'aiconnect'),
          instructions: variant.label,
        }),
      );
    },
    save() {
      return null;
    },
  });
})(window.wp);
