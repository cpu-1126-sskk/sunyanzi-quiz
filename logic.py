import json
import os

def load_question_bank(file_path="questionbank.json"):
    """
    读取完整题库数据（含门户问题、路由矩阵与组态解析）
    """
    if not os.path.exists(file_path):
        print(f"警告: 未找到题库文件 {file_path}")
        return {}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        print(f"错误: 题库文件 {file_path} JSON 格式不合法 - {e}")
        return {}

def get_diversion_group(q1_choice, q2_choice, bank=None):
    """
    根据门户回答，从路由矩阵获取对应组态名
    """
    if bank is None:
        bank = load_question_bank()
    
    matrix = bank.get("routing_matrix", {})
    
    # 防御性编程：确保输入为有效字符串，避免 None 值引发的异常
    safe_q1 = str(q1_choice).strip() if q1_choice else ""
    safe_q2 = str(q2_choice).strip() if q2_choice else ""
    
    route_key = f"{safe_q1}{safe_q2}".upper()
    return matrix.get(route_key)

def calculate_configuration(q1_choice, q2_choice, bank=None):
    """别名函数，用于计算组态"""
    return get_diversion_group(q1_choice, q2_choice, bank)

def calculate_result(config_name, answers, bank=None):
    """
    计算最终结果（积分逻辑 + 触发词锁定）
    
    :param config_name: 组态名称 (如 '组态一')
    :param answers: 当前用户的所有回答字典, 如 {'Q1': 'A', 'Q3': 'A', 'Q4': 'B', 'Q5': 'A'}
    :param bank: 题库数据
    :return: 选中的歌曲名称
    """
    if bank is None:
        bank = load_question_bank()
    
    config = bank.get("configurations", {}).get(config_name)
    if not config:
        print(f"警告: 未在题库中找到组态 [{config_name}]")
        return None

    scores = {}
    
    # 遍历当前组态下的所有问题
    for q in config.get("questions", []):
        qid = q.get("id")
        choice_id = answers.get(qid)
        
        # 如果用户（由于某种异常）没有回答该题，则跳过计分
        if not choice_id:
            continue
        
        # 查找对应选项
        option = next((opt for opt in q.get("options", []) if opt.get("id") == choice_id), None)
        if not option:
            continue
            
        # 1. 检查一票否决（触发词锁定，拥有最高优先级）
        if "trigger" in option and option["trigger"]:
            return option["trigger"]
            
        # 2. 累加积分
        opt_scores = option.get("scores", {})
        for song_name, weight in opt_scores.items():
            # 确保 weight 是数值类型
            try:
                numeric_weight = float(weight)
                scores[song_name] = scores.get(song_name, 0.0) + numeric_weight
            except (ValueError, TypeError):
                print(f"警告: 歌曲 [{song_name}] 的权重 [{weight}] 无法转换为数值。")
                continue

    # 返回积分最高的歌曲
    if not scores:
        print(f"警告: 组态 [{config_name}] 计算完毕后没有任何积分产生，请检查题库分数配置。")
        return None
        
    # 同分按歌名字符串次序裁决，避免平局依赖 dict 插入顺序
    final_song = max(scores, key=lambda k: (scores[k], k))
    return final_song

if __name__ == "__main__":
    # 本地沙盒测试逻辑
    test_bank = load_question_bank()
    print(f"成功读取题库: {test_bank.get('project_info', {}).get('title', '未命名项目')}")
    
    # 测试路由
    test_routes = [('A', 'A'), ('A', 'B'), ('C', 'C'), (None, 'A')]
    print("\n路由测试:")
    for q1, q2 in test_routes:
        print(f"Q1={q1}, Q2={q2} -> {get_diversion_group(q1, q2, test_bank)}")
        
    # 模拟题库结构进行计分测试
    mock_bank = {
        "configurations": {
            "组态一": {
                "questions": [
                    {"id": "Q3", "options": [{"id": "A", "scores": {"风筝": 2, "逆光": 1}}]},
                    # Q4 选项 B：遇见总分需严格高于风筝，避免 max 平局时结果依赖字典顺序
                    {"id": "Q4", "options": [{"id": "B", "scores": {"风筝": 1, "遇见": 4}}]}
                ]
            },
            "组态二": {
                "questions": [
                    {"id": "Q5", "options": [{"id": "A", "trigger": "克卜勒"}]}
                ]
            }
        }
    }
    
    # 测试计分逻辑
    test_answers = {'Q3': 'A', 'Q4': 'B'}
    result = calculate_result('组态一', test_answers, mock_bank)
    print(f"\n组态一计算测试: {test_answers} -> 最终歌曲 (预期: 遇见): {result}")
    
    # 测试触发词逻辑
    test_trigger_answers = {'Q5': 'A'}
    result_trigger = calculate_result('组态二', test_trigger_answers, mock_bank)
    print(f"组态二触发测试: {test_trigger_answers} -> 最终歌曲 (预期: 克卜勒): {result_trigger}")
