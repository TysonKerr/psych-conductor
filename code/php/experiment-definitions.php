<?php

define('TRIAL_TYPES_DIR', APP_ROOT . '/trial-types');

function prepare_experiment() {
    start_session();
    validate_session_for_experiment();
}

function validate_session_for_experiment() {
    if (!isset($_SESSION['username'], $_SESSION['id'])
        || !user_data_exists($_SESSION['username'])
    ) {
        header('Location: index.php');
        exit;
    }
}

function get_trial_type_names() {
    $names = [];
    
    foreach (scandir(TRIAL_TYPES_DIR) as $entry) {
        if ($entry === '.' or $entry === '..') continue;
        
        $trial_type_dir = TRIAL_TYPES_DIR . "/$entry";
        
        if (!is_dir($trial_type_dir)) continue;
        
        $names[] = $entry;
    }
    
    return $names;
}

function get_trial_types() {
    $trial_type_names = get_trial_type_names();
    $trial_types = [];
    
    $additional_files = [
        'script' => 'script.js',
        'style' => 'style.css'
    ];
    
    foreach ($trial_type_names as $name) {
        $dir = TRIAL_TYPES_DIR . "/$name";
        
        if (!is_file("$dir/display.html")) continue;
        
        $trial_types[$name] = [
            'display' => file_get_contents("$dir/display.html")
        ];
        
        foreach ($additional_files as $content_name => $filename) {
            if (is_file("$dir/$filename")) {
                $trial_types[$name][$content_name] = file_get_contents("$dir/$filename");
            }
        }
    }
    
    return $trial_types;
}

function get_responses($username, $id_list) {
    $responses = [];
    
    foreach ($id_list as $id) {
        $filename = APP_ROOT . "/data/$username/$id-responses.csv";
        
        if (is_file($filename)) {
            $responses = array_merge(read_csv($filename), $responses);
        }
    }
    
    return $responses;
}

function get_exp_data($username, $id) {
    $metadata = get_metadata($username, $id);
    $conditions = get_conditions();
    $condition = $conditions[$metadata['Condition_Index']];
    
    return [
        'condition' => $condition,
        'procedure' => get_exp_files('experiment/procedures/' . $condition['Procedure']),
        'stimuli'   => get_exp_files('experiment/stimuli/' .    $condition['Stimuli']),
        'responses' => get_responses($username, $metadata['ID_list']),
        'shuffle_seed' => $metadata['Shuffle_Seed']
    ];
}

function get_exp_files($filename) {
    $data = [$filename => read_csv(APP_ROOT . '/' . $filename)];
    
    foreach ($data[$filename] as $row) {
        if (!isset($row['Subfile'])) break;
        if ($row['Subfile'] === '') continue;
        
        $nested_file = dirname($filename) . '/' . $row['Subfile'];
        
        if (!isset($data[$nested_file])) {
            $data = array_merge($data, get_exp_files($nested_file));
        }
    }
    
    return $data;
}

function get_trial_template() {
    return file_get_contents(APP_ROOT . '/code/html/trial-template.html');
}

function get_experiment_resources($username, $id) {
    return json_encode([
        'trial_template' => get_trial_template(),
        'exp_data' => get_exp_data($username, $id),
        'trial_types' => get_trial_types()
    ]);
}
