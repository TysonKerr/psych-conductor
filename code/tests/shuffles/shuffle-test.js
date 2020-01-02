"use strict";

const shuffle_demos = {
    csvs: [],
    
    init: function() {
        const container = document.getElementById("shuffle-demo-container");
        
        container.addEventListener("click", event => {
            if (event.target.tagName === "BUTTON") {
                this.reshuffle_demo(event.target.closest(".shuffle-demo"));
            }
        });
    },
    
    add: function(csv_lines) {
        const csv = this.make_csv(csv_lines);
        const csv_index = this.csvs.length;
        const unshuffled_csv = this.get_csv_clone_with_contents_wrapped(csv, csv_index);
        this.csvs.push(unshuffled_csv);
        const shuffled_csv = this.clone_csv(unshuffled_csv);
        CSV.shuffle(shuffled_csv);
        this.add_demo_html(csv_index, unshuffled_csv, shuffled_csv);
        
    },
    
    make_csv: function(csv_lines) {
        const csv = [];
        const headers = csv_lines[0];
        
        for (let i = 1; i < csv_lines.length; ++i) {
            const row = {};
            
            for (let j = 0; j < headers.length; ++j) {
                row[headers[j]] = (j in csv_lines[i]) ? csv_lines[i][j] : "";
            }
            
            csv.push(row);
        }
        
        return csv;
    },
    
    get_csv_clone_with_contents_wrapped: function(csv, csv_id) {
        const clone = this.clone_csv(csv);
        const headers = Object.keys(clone[0]);
        
        for (let y = 0; y < clone.length; ++y) {
            for (let x = 0; x < headers.length; ++x) {
                clone[y][headers[x]] = new Cell(clone[y][headers[x]], x, y, csv_id);
            }
        }
        
        return clone;
    },
    
    clone_csv: function(csv) {
        const clone = [];
        
        for (let i = 0; i < csv.length; ++i) {
            let row = {};
            
            for (let col in csv[i]) {
                row[col] = csv[i][col].clone ? csv[i][col].clone() : csv[i][col];
            }
            
            clone.push(row);
        }
        
        return clone;
    },
    
    add_demo_html: function(csv_id, unshuffled_csv, shuffled_csv) {
        const container = document.getElementById("shuffle-demo-container");
    
        container.insertAdjacentHTML("beforeend", 
            "<div class='shuffle-demo' data-csv='" + csv_id + "'>"
                + "<div class='csv-pair-container'><div>"
                + this.get_csv_html(unshuffled_csv)
                + "</div><div>"
                + this.get_csv_html(shuffled_csv)
                + "</div></div>"
                + "<div><button class='reshuffle-button'>Reshuffle</button></div>"
            + "</div>"
        );
    },
    
    get_csv_html: function(csv) {
        const cols = Object.keys(csv[0]).length,
              rows = csv.length;
        
        let html = `<table style='--cols: ${cols}; --rows: ${rows};'> <thead> <tr> <th>`
            + Object.keys(csv[0]).join("</th> <th>")
            + "</th> </tr> </thead> <tbody>";
        
        for (let i = 0; i < csv.length; ++i) {
            html += "<tr> <td>" + Object.values(csv[i]).map(cell => cell.get_wrapped_value()).join("</td> <td>") + "</td> </tr>";
        }
        
        html += "</tbody> </table>";
        return html;
    },
    
    reshuffle_demo: function(demo_element) {
        const csv_index = demo_element.dataset.csv;
        const csv_shuffled = this.clone_csv(this.csvs[csv_index]);
        CSV.shuffle(csv_shuffled);
        const shuffled_container = demo_element.querySelector(".csv-pair-container > div:last-child");
        shuffled_container.innerHTML = this.get_csv_html(csv_shuffled);
    }
};

function Cell(value, x, y, class_prefix) {
    this.value = value;
    this.x = x;
    this.y = y;
    this.class_prefix = class_prefix;
}

Cell.prototype = {
    toString: function() { return this.value; },
    get_wrapped_value: function() {
        return `<span class='shuffle-cell c-${this.class_prefix}-${this.x}-${this.y}'>`
                + this.value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                + "</span>";
    },
    clone: function() {
        return new Cell(this.value, this.x, this.y, this.class_prefix);
    }
};

const cell_colors = {
    selected_cell_classes: [],
    cell_class_lookup: {},
    input: null,
    selecting: 0, // 1 for selecting, -1 for deselecting
    selecting_bgc: "rgb(126, 190, 254)",
    selecting_outline: "2px solid #be0000",
    
    init: function() {
        this.input = document.getElementById("cell-color-input");
        this.sheet = document.getElementById("cell-styles").sheet;
        this.rules = this.sheet.cssRules || this.sheet.rules;
        
        this.input.addEventListener("input", e => this.set_color(e.target.value));

        document.addEventListener("mousedown", event => {
            if (event.target.classList.contains("shuffle-cell")) {
                this.process_cell_mousedown(event.target, event.ctrlKey);
            } else if (event.ctrlKey) {
                this.selecting = 1;
            } else if (event.target !== this.input
                && event.target.tagName !== "BUTTON"
            ) {
                this.selecting = 0;
                this.end_input();
            }
        });
        
        document.addEventListener("mouseup", e => {
            this.selecting = 0;
        });
        
        document.addEventListener("mouseover", e => {
            if (this.selecting === 0) return;
            
            if (e.target.classList.contains("shuffle-cell")) {
                this.select_cell(e.target);
            }
        });
    },
    
    process_cell_mousedown: function(cell, ctrl_key) {
        if (ctrl_key) {
            if (this.is_selected(cell.classList[1])) {
                this.selecting = -1;
            } else {
                this.selecting = 1;
            }
            
            this.select_cell(cell);
        } else {
            this.selecting = 1;
            this.start_input(event.target);
        }
    },
    
    is_selected: function(cell_class) {
        return this.selected_cell_classes.indexOf(cell_class) > -1;
    },
    
    set_color: function(color) {
        let rgb = color.match(/#(..)(..)(..)/).slice(1).map(val => parseInt(val, 16));
        
        const text_color = this.get_contrast_color(rgb);
        
        this.selected_cell_classes.forEach(cell_class => {
            const rule = this.get_rule(cell_class);
            rule.style.backgroundColor = color;
            rule.style.color = text_color;
        });
    },
    
    get_contrast_color: function(rgb) {
        // https://www.w3.org/TR/WCAG20-TECHS/G18.html
        const weights = [0.2126, 0.7152, 0.0722];
        const luminance = rgb
            .map(v => v/255)
            .map(v => v <= 0.3928 
                    ? v / 12.92 
                    : ((v + 0.055)/1.055)**2.4)
            .map((v, i) => v * weights[i])
            .reduce((sum, v) => sum + v);
        return luminance < 0.48 ? "white" : "black";
    },
    
    get_rule: function(cell_class) {
        if (!(cell_class in this.cell_class_lookup)) {
            this.cell_class_lookup[cell_class] = this.rules.length;
            this.sheet.insertRule(`.${cell_class} {}`, this.rules.length);
        }
        
        return this.rules[this.cell_class_lookup[cell_class]];
    },
    
    start_input: function(selected_cell) {
        this.clear_selected_cell_classes();
        this.select_cell(selected_cell);
        const current_color = this.get_rgb_of_background_color(selected_cell);
        this.input.value = current_color === "#ffffff" ? "#00ff00" : current_color;
        this.input.classList.add("shown");
    },
    
    select_cell: function(cell) {
        const deselecting = this.selecting === -1;
        const cell_class = cell.classList[1];
        
        if (deselecting) {
            this.selected_cell_classes.splice(this.selected_cell_classes.indexOf(cell_class), 1);
            this.remove_cell_selecting_style(cell_class);
        } else {
            this.selected_cell_classes.push(cell_class);
            this.add_cell_selecting_style(cell_class);
        }
    },
    
    add_cell_selecting_style: function(cell_class) {
        const rule = this.get_rule(cell_class);
        rule.style.outline = this.selecting_outline;
        
        if (rule.style.backgroundColor === "" || rule.style.backgroundColor === "rgb(255, 255, 255)") {
            rule.style.backgroundColor = this.selecting_bgc;
        }
    },
    
    remove_cell_selecting_style: function(cell_class) {
        const rule = this.get_rule(cell_class);
        rule.style.outline = "";
        
        if (rule.style.backgroundColor === this.selecting_bgc) {
            rule.style.backgroundColor = "";
            rule.style.color = "";
        }
    },

    end_input: function () {
        this.clear_selected_cell_classes();
        document.getElementById("cell-color-input").classList.remove("shown");
    },
    
    clear_selected_cell_classes: function() {
        this.selected_cell_classes.forEach(cell_class => {
            this.remove_cell_selecting_style(cell_class);
        });
        
        this.selected_cell_classes.splice(0, this.selected_cell_classes.length);
    },
    
    get_rgb_of_background_color: function(element) {
        // credit Danilo Valente @ https://stackoverflow.com/questions/11670019/does-object-style-color-only-return-rgb
        let rgb = getComputedStyle(element).backgroundColor.match(/\d+/g);
        
        if (rgb.length > 3) {
            if (rgb[3] === "0") {
                return "#ffffff";
            } else {
                rgb.splice(3, rgb.length - 3);
            }
        }
        
        return "#" + rgb.map(val => parseInt(val).toString(16).padStart(2, "0")).join("");
    }
}