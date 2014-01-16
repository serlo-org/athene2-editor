/*global define*/
define(['jquery', 'underscore', 'layout_builder', 'system_notification', 'events'], function ($, _, LayoutBuilder, SystemNotification, eventScope) {
    "use strict";
    function invoke(instance, constructor) {
        $.extend(instance, constructor.prototype);
        constructor.apply(instance, Array.prototype.slice.call(arguments, 2));
    }

    var Field = function (field, type, label) {
        var $errorList;
        this.field = field;
        this.$field = $(field);
        this.$label = $('<label class="preview-label">');
        this.type = type;
        this.label = label || '';

        this.hasError = !!this.$field.parents('.has-error').length;

        if (this.hasError) {
            $errorList = this.$field.siblings().filter('.help-block');
            $('li', $errorList).each(function () {
                SystemNotification.notify(this.innerHTML, 'danger', true);
            });
        }

        eventScope(this);

        this.init();
    };

    Field.prototype.init = function () {
        var self = this;
        self.$el = $('<div>');
        self.$inner = $('<div>').addClass('preview-content');

        if (self.hasError) {
            self.$el.addClass('has-error');
        }

        self.$el.append(self.$inner);

        self.$inner.click(function () {
            self.trigger('select', self);
        });

        self.data = this.$field.val();
    };

    Field.prototype.setLabel = function (label) {
        this.label = label;
        this.$label.append(label);
        this.$el.prepend(this.$label);
    };

    Field.Textarea = function (field, label) {
        var self = this;
        invoke(self, Field, field, 'textarea', label);

        self.$inner.unbind('click');
        self.data = this.$field.val();

        self.updateField = _.throttle(function () {
            var updatedValue = [];
            _.each(self.layoutBuilder.rows, function (row) {
                var _row = [];

                _.each(row.columns, function (column) {
                    _row.push({
                        col: column.type,
                        content: column.data
                    });
                });

                updatedValue.push(_row);
            });

            if (updatedValue.length) {
                self.$field.val(JSON.stringify(updatedValue));
            } else {
                // Truly empty the field when there is no content.
                self.$field.val('');
            }
        }, 2000);
    };

    Field.Textarea.prototype.addLayoutBuilder = function (layoutBuilderConfiguration) {
        var self = this;
        self.layoutBuilder = new LayoutBuilder(layoutBuilderConfiguration);

        self.layoutBuilder.addEventListener('add', function (row) {
            self.$inner.append(row.$el);

            row.addEventListener('select', function (column) {
                self.trigger('select', self, column);
            });

            row.addEventListener('update', function (column) {
                self.updateField();
                self.trigger('update', column);
            });

            row.addEventListener('remove', function (row) {
                self.trigger('removed-row', row);
            });

            _.each(row.columns, function (column) {
                self.trigger('column-add', column);
            });
        });

        self.$el.append(self.layoutBuilder.$el);

        this.parseFieldData();
    };

    Field.Textarea.prototype.parseFieldData = function () {
        var self = this,
            data = $(self.field).val() || '[]';

        try {
            data = JSON.parse(data);
        } catch (e) {
            // throw new Error(e.message);
            data = [[{
                col: 24,
                content: data
            }]];
        }

        _.each(data, function (columns) {
            var row = [],
                data = [],
                layout;

            _.each(columns, function (column) {
                row.push(column.col);
                data.push(column.content);
            });

            layout = self.layoutBuilder.addRow(row, data);
        });
    };

    Field.PlainText = function (field, label) {
        var self = this;
        invoke(self, Field, field, 'plaintext', label);

        self.data = {};
        self.data.value = self.$field.text();

        self.$input = $('<textarea>')
            .addClass('preview-textarea')
            .text(self.data.value);

        self.$inner.append(self.$input);
        self.$input.on('keyup', function () {
            self.data.value = this.value;
            self.$field.text(self.data.value);
        });
    };

    Field.Input = function (field, label) {
        var self = this;
        invoke(self, Field, field, 'input', label);

        self.data = {};
        self.data.value = self.field.value;
        self.data.placeholder = self.$field.attr('placeholder') || '';

        self.$input = $('<input type="text">')
            .attr({
                placeholder: self.data.placeholder
            })
            .addClass('preview-input')
            .val(self.data.value);

        self.$inner.append(self.$input);

        if ($.fn.datepicker && self.$field.hasClass('datepicker')) {
            self.$input.datepicker({
                format: 'dd.mm.yyyy'
            }).on('changeDate', function () {
                self.$input.trigger('keyup');
            });
        }

        self.$input.on('keyup', function () {
            self.data.value = self.field.value = this.value;
        });
    };

    Field.Checkbox = function (field, label) {
        var self = this;
        invoke(self, Field, field, 'input', label);

        self.data = self.$field.is(':checked');

        self.$checkbox = $('<input type="checkbox">')
            .addClass('preview-checkbox')
            .attr('checked', self.data);

        self.$label
            .addClass('field-checkbox')
            .prepend(self.$checkbox);

        self.$checkbox.change(function () {
            self.data = self.$checkbox.is(':checked');
            self.$field
                .attr('checked', self.data)
                .val(self.data ? 1 : 0);
        });
    };

    Field.Select = function (field, label) {
        var self = this;
        invoke(self, Field, field, 'input', label);

        self.$select = $('<select>')
            .addClass('preview-select');

        if (self.$field.attr('multiple')) {
            self.$select.attr('multiple', true);
        }

        $('option', self.$field).each(function () {
            self.$select.append($(this).clone());
        });

        self.$select.change(function () {
            self.data = $(this).val();
            self.$field.val(self.data);
        });

        self.$inner.append(self.$select);
    };

    Field.Radio = function (field, label) {
        var self = this;
        invoke(self, Field, field, 'input', label);

        self.$radio = $('<input type="radio">')
            .addClass('preview-radio')
            .attr('name', self.$field.attr('name'));

        if (self.$field.is(':checked')) {
            self.$radio.attr('checked', true);
        }

        self.$inner = $('<label class="preview-content preview-radio-container">');
        self.$el.append(self.$inner);

        self.$radio.change(function () {
            self.data = self.$radio.is(':checked');
            self.$field.attr('checked', self.data);
        });

        self.$inner.append(self.$radio).append(self.$field.val());
    };

    return Field;
});